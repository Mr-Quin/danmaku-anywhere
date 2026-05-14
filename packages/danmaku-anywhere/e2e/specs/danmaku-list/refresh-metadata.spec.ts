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
 * Refresh Metadata menu on a season card. Seeds a Bilibili season with a
 * stale title, navigates to /danmaku, clicks the Refresh menu item, mocks
 * the upstream season endpoint with a fresh title, then asserts the season
 * in DB has been re-upserted (version bumped + title updated).
 */

const STALE_TITLE = '旧标题 (stale)'

const BILIBILI_SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'builtin:bilibili',
  indexedId: '41410',
  title: STALE_TITLE,
  type: '番剧',
  imageUrl: 'https://i0.hdslb.com/bfs/bangumi/image/frieren.jpg',
  episodeCount: 28,
  year: 2023,
  schemaVersion: 1,
}

function makeEpisode(seasonId: number): EpisodeInsert {
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

test('danmaku list: refresh metadata pulls fresh season info', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)

  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    // The /pgc/view/web/season fixture has the canonical (fresh) title.
    network: mockBilibiliXml({
      searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
      searchFt: loadJsonFixture('bilibili-search-ft.json'),
      season: loadJsonFixture('bilibili-season.json'),
      xml: loadTextFixture('bilibili-xml.xml'),
    }),
  })

  const seeded = await da.season.add(BILIBILI_SEASON)
  await da.episode.add(makeEpisode(seeded.id))
  expect(seeded.title).toBe(STALE_TITLE)
  expect(seeded.version).toBe(1)

  const popup = await Popup.open(page, extensionId, '/danmaku')
  const card = await popup.seasonList.waitForFirstCard('Bilibili')

  await popup.seasonList.openCardMenu(card, 'refresh')

  // Refresh calls SeasonService.upsert which bumps version. Title becomes
  // whatever the bilibili-season.json fixture says.
  await expect
    .poll(async () => (await da.season.get(seeded.id))?.version, {
      timeout: 10_000,
    })
    .toBeGreaterThan(1)

  const refreshed = await da.season.get(seeded.id)
  expect(refreshed?.title).not.toBe(STALE_TITLE)
})
