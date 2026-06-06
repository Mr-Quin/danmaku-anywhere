import {
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Bookmark add/remove on the DanmakuTree (/mount) via the season context
 * menu. Asserts the Bookmark record carries upstream stubs and the season
 * row shows the +N stub indicator; remove reverts both.
 *
 * Bilibili season fixture has 2 episodes → 1 stub after deduping the seeded
 * persisted episode by indexedId.
 */

const SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'bilibili',
  indexedId: '41410',
  title: '葬送的芙莉莲',
  type: '番剧',
  imageUrl: 'https://bilibili-cdn.invalid/x.jpg',
  episodeCount: 28,
  year: 2023,
  schemaVersion: 1,
}

function makeEpisode(seasonId: number): EpisodeInsert {
  // indexedId matches the fixture's first episode so stub dedup leaves 1.
  return {
    provider: DanmakuSourceType.Bilibili,
    providerIds: { cid: 1300001, aid: 100001, bvid: 'BV1aaaaaaaa' },
    indexedId: '1300001',
    title: 'Episode 1',
    episodeNumber: '1',
    seasonId,
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
    lastChecked: 0,
  }
}

test('mount tree: bookmark adds stubs, remove clears them', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: mockBilibiliXml({
      searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
      searchFt: loadJsonFixture('bilibili-search-ft.json'),
      season: loadJsonFixture('bilibili-season.json'),
      xml: loadTextFixture('bilibili-xml.xml'),
    }),
  })

  const season = await da.season.add(SEASON)
  await da.episode.add(makeEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)

  await popup.mount.openItemMenu(seasonItem, 'bookmarkAdd')

  await expect(seasonItem).toContainText(/\+1/)

  await expect.poll(() => da.bookmark.bySeason(season.id)).toBeTruthy()
  const bookmark = await da.bookmark.bySeason(season.id)
  expect(bookmark?.episodes.length).toBe(2)

  await popup.mount.openItemMenu(seasonItem, 'bookmarkRemove')

  await expect(seasonItem).not.toContainText(/\+\d+/)
  await expect.poll(() => da.bookmark.bySeason(season.id)).toBeUndefined()
})
