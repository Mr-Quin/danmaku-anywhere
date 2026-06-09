import {
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Refresh Metadata via the season's context menu in the DanmakuTree.
 * Seeds a Bilibili season with a stale title + an episode, clicks the
 * Refresh menu, mocks the upstream season endpoint with a fresh title,
 * and asserts the user sees a success toast and the tree row drops the
 * stale title, with the DB record re-upserted (version bumped + title
 * replaced).
 */

const STALE_TITLE = '旧标题 (stale)'

const SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'bilibili',
  indexedId: '41410',
  title: STALE_TITLE,
  type: '番剧',
  imageUrl: 'https://bilibili-cdn.invalid/x.jpg',
  episodeCount: 28,
  year: 2023,
  schemaVersion: 1,
}

function makeEpisode(seasonId: number): EpisodeInsert {
  return {
    provider: DanmakuSourceType.Bilibili,
    providerIds: { cid: 1300001, aid: 100001, bvid: 'BV1aaaaaaaa' },
    indexedId: '1300001',
    title: 'Ep1',
    episodeNumber: '1',
    seasonId,
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
    lastChecked: 0,
  }
}

test('mount tree: refresh metadata replaces stale season info', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: mockBilibiliXml({
      searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
      searchFt: loadJsonFixture('bilibili-search-ft.json'),
      season: loadJsonFixture('bilibili-season.json'),
      xml: loadTextFixture('bilibili-xml.xml'),
    }),
  })

  const seeded = await da.season.add(SEASON)
  await da.episode.add(makeEpisode(seeded.id))
  expect(seeded.title).toBe(STALE_TITLE)
  expect(seeded.version).toBe(1)

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(seeded.id)

  await popup.mount.openItemMenu(seasonItem, 'refresh')

  await popup.toast.expectSuccess(/Success|成功/)
  await expect(seasonItem).not.toContainText(STALE_TITLE)

  await expect
    .poll(async () => (await da.season.get(seeded.id))?.version)
    .toBeGreaterThan(1)

  const refreshed = await da.season.get(seeded.id)
  expect(refreshed?.title).not.toBe(STALE_TITLE)
})
