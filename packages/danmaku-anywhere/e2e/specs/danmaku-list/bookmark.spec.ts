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
 * Bookmark add/remove toggle from the season-list page. Seeds a Bilibili
 * season directly via the dev API (no search), navigates to /danmaku,
 * opens the season card menu, clicks Bookmark, and asserts the bookmark
 * appears in the DB. Repeats for Remove Bookmark.
 *
 * The bookmark-add flow hits the season's upstream "episodes" endpoint
 * (BookmarkService.add calls ProviderService.fetchEpisodesBySeason), so
 * we mock the Bilibili season endpoint.
 */

const BILIBILI_SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'builtin:bilibili',
  indexedId: '41410',
  title: '葬送的芙莉莲',
  type: '番剧',
  imageUrl: 'https://i0.hdslb.com/bfs/bangumi/image/frieren.jpg',
  episodeCount: 28,
  year: 2023,
  schemaVersion: 1,
}

// SeasonList filters seasons with no episodes out by default, so we seed
// one alongside the season.
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

test('danmaku list: bookmark toggle on a season card', async ({
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

  const season = await da.season.add(BILIBILI_SEASON)
  await da.episode.add(makeEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/danmaku')
  const card = await popup.seasonList.waitForFirstCard('Bilibili')

  await popup.seasonList.openCardMenu(card, 'bookmark')

  await expect
    .poll(() => da.bookmark.bySeason(season.id), { timeout: 10_000 })
    .toBeTruthy()

  await popup.seasonList.openCardMenu(card, 'bookmark')

  await expect
    .poll(() => da.bookmark.bySeason(season.id), { timeout: 10_000 })
    .toBeUndefined()
})
