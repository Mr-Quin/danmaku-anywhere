import {
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Refresh Danmaku menu on an episode row in /danmaku/:seasonId. Seeds a
 * Bilibili season, lands on the episode list (which fetches episodes
 * upstream from the mocked season endpoint), clicks the per-row Refresh
 * menu item to re-fetch danmaku, and asserts the row renders a comment
 * count.
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

test('danmaku list: refresh danmaku from episode row menu', async ({
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

  const seeded = await da.season.add(BILIBILI_SEASON)
  await da.episode.add(makeEpisode(seeded.id))

  const popup = await Popup.open(page, extensionId, `/danmaku/${seeded.id}`)
  const episode = await popup.episodeList.waitForFirstEpisode(
    'Bilibili',
    15_000
  )

  await popup.episodeList.openEpisodeMenu(episode, 'refresh')
  await popup.episodeList.expectCommentCount(episode)
})
