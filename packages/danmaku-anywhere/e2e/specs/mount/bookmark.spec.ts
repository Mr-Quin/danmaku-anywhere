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
 * Bookmark add/remove on the DanmakuTree (/mount) via the season context
 * menu. Asserts the Bookmark record carries upstream stubs, the season row
 * shows downloaded out of total episodes with a label saying so, and the
 * remove entry is labelled as the unfollow action; remove reverts both.
 *
 * Bilibili season fixture has 2 episodes → 1 stub after deduping the seeded
 * persisted episode by indexedId.
 */

test('mount tree: bookmark adds stubs, remove clears them', {
  tag: '@smoke',
}, async ({ context, page, extensionId, da }) => {
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
  await da.episode.add(makeBilibiliEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)

  await popup.mount.openItemMenu(seasonItem, 'bookmarkAdd')

  const episodeCount = popup.mount.seasonEpisodeCount(season.id)
  await expect(episodeCount).toHaveText('1/2')
  await expect(episodeCount).toHaveAttribute(
    'aria-label',
    /^(1 of 2 episodes downloaded|已下载 1\/2 集)$/
  )

  await expect.poll(() => da.bookmark.bySeason(season.id)).toBeTruthy()
  const bookmark = await da.bookmark.bySeason(season.id)
  expect(bookmark?.episodes.length).toBe(2)

  await popup.mount.openContextMenu(seasonItem)
  const unfollow = popup.mount.contextMenuItem('bookmarkRemove')
  await expect(unfollow).toHaveText(/^(Unfollow|取消关注)$/)
  await unfollow.click()
  await expect(unfollow).toBeHidden()

  await expect(episodeCount).toHaveText('1')
  await expect(episodeCount).toHaveAttribute(
    'aria-label',
    /^(1 episode downloaded|已下载 1 集)$/
  )
  await expect.poll(() => da.bookmark.bySeason(season.id)).toBeUndefined()
})
