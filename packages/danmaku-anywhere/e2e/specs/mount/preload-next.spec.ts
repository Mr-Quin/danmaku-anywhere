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
 * Bookmark-driven preload of the next episode. Bookmarks a season whose
 * upstream list has 2 episodes but only episode 1 is fetched, leaving episode
 * 2 as a stub. Invokes the production episodePreloadNext RPC (the transport
 * the player fires at 50% playback) for episode 1, then asserts the episode-2
 * stub row is replaced by a fetched episode row with a non-zero comment count.
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
  // indexedId matches the season fixture's first episode (cid 1300001), so the
  // bookmark snapshot leaves only the second episode as an unfetched stub.
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

test('mount tree: bookmark-driven preload caches the next episode', async ({
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
  const episode = await da.episode.add(makeEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)

  await popup.mount.openItemMenu(seasonItem, 'bookmarkAdd')
  await expect(seasonItem).toContainText(/\+1/)

  await popup.mount.expandSeason(season.id)
  const nextStub = popup.mount.stubItem(season.id, '1300002')
  await expect(nextStub).toBeVisible()

  // Invoke the production RPC the player fires at 50% playback, sending the
  // currently playing episode (ep1). The 50% timer itself needs a mounted
  // video and is out of scope; the unit under test is the background handler.
  await page.evaluate((meta) => {
    return chrome.runtime.sendMessage({
      method: 'episodePreloadNext',
      input: meta,
    })
  }, episode)

  // Preload caches in the background while the popup is closed in real use, so
  // reopen to read the post-preload DB state the user would next see.
  await page.reload()
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)

  await expect(nextStub).toBeHidden()
  await expect(seasonItem).not.toContainText(/\+\d+/)

  const episodeItems = popup.mount.episodeItems()
  await expect(episodeItems).toHaveCount(2)

  const episodeIds = await episodeItems.evaluateAll((els) =>
    els.map((el) =>
      Number(el.getAttribute('data-testid')?.replace('tree-item-episode-', ''))
    )
  )
  const nextEpisodeId = episodeIds.find((id) => id !== episode.id) as number

  await expect(popup.mount.episodeCommentCount(nextEpisodeId)).not.toHaveText(
    '0'
  )

  await expect
    .poll(async () => (await da.episode.get(nextEpisodeId))?.commentCount)
    .toBeGreaterThan(0)
})
