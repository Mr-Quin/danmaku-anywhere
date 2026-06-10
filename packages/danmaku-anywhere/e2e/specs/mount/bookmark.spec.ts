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
 * menu. Asserts the Bookmark record carries upstream stubs and the season
 * row shows the +N stub indicator; remove reverts both.
 *
 * Bilibili season fixture has 2 episodes → 1 stub after deduping the seeded
 * persisted episode by indexedId.
 */

test('mount tree: bookmark adds stubs, remove clears them', async ({
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
  await da.episode.add(makeBilibiliEpisode(season.id))

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
