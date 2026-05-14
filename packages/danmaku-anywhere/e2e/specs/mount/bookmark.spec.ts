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
 * Bookmark add/remove on the DanmakuTree (/mount). Seeds a Bilibili season
 * + one persisted episode, bookmarks via the season's context menu, and
 * asserts that:
 *   - bookmark.bySeason returns a Bookmark whose .episodes carries the
 *     upstream-fetched stubs (the "additional undownloaded episodes"
 *     surfaced to the user)
 *   - the season tree item shows the +N stub indicator
 * Then removes the bookmark and asserts both signals revert.
 *
 * BookmarkService.add triggers an upstream episode fetch
 * (ProviderService.fetchEpisodesBySeason), so the Bilibili season fixture
 * (2 episodes) is mocked — yielding 1 stub after deduping the persisted
 * episode by indexedId.
 */

const SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'builtin:bilibili',
  indexedId: '41410',
  title: '葬送的芙莉莲',
  type: '番剧',
  imageUrl: 'https://bilibili-cdn.invalid/x.jpg',
  episodeCount: 28,
  year: 2023,
  schemaVersion: 1,
}

function makeEpisode(seasonId: number): EpisodeInsert {
  // Matches the fixture's first episode by indexedId (= cid) so that the
  // bookmark stubs dedupe it down to one undownloaded episode.
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

  // Ground truth: bookmark exists in DB.
  await expect
    .poll(() => da.bookmark.bySeason(season.id), { timeout: 10_000 })
    .toBeTruthy()

  // Bookmark stores all upstream episodes (2 from the season fixture).
  const bookmark = await da.bookmark.bySeason(season.id)
  expect(bookmark?.episodes.length).toBe(2)

  // UI surface: the season tree item now shows a `+N` indicator for
  // undownloaded stubs (2 from upstream - 1 already persisted = 1 stub).
  await expect(seasonItem).toContainText(/\+1/, { timeout: 10_000 })

  // Remove the bookmark via the same menu (id changes to bookmarkRemove
  // once bookmarked).
  await popup.mount.openItemMenu(seasonItem, 'bookmarkRemove')

  await expect
    .poll(() => da.bookmark.bySeason(season.id), { timeout: 10_000 })
    .toBeUndefined()

  // +N indicator gone.
  await expect(seasonItem).not.toContainText(/\+\d+/)
})
