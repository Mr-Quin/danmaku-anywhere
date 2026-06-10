import { mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Refresh Danmaku from an episode's context menu in the DanmakuTree.
 * Seeds an episode with zero comments, clicks the per-episode Refresh
 * action, mocks the bilibili XML danmaku endpoint, and asserts the comment
 * count rendered in the episode row leaves zero, with the DB commentCount
 * bumping above zero.
 */

test('mount tree: refresh danmaku fetches new comments for an episode', async ({
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

  const season = await da.season.add(makeBilibiliSeason())
  const episode = await da.episode.add(makeBilibiliEpisode(season.id))
  expect(episode.commentCount).toBe(0)

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)

  const episodeItem = await popup.mount.episodeItem(episode.id).first()
  await expect(episodeItem).toBeVisible()

  await popup.mount.openItemMenu(episodeItem, 'refresh')

  await expect
    .poll(async () => (await da.episode.get(episode.id))?.commentCount)
    .toBeGreaterThan(0)

  const refreshed = await da.episode.get(episode.id)
  await expect(popup.mount.episodeCommentCount(episode.id)).toHaveText(
    String(refreshed?.commentCount)
  )
})
