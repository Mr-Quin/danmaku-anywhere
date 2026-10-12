import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * A library filter that matches nothing says so and names the query, instead
 * of claiming the library is empty, and its clear action brings the tree back.
 * An empty library still shows the empty-library prompt.
 */

test('library filter with no matches offers to clear the filter', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })
  const season = await da.season.add(makeBilibiliSeason())
  await da.episode.add(makeBilibiliEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)

  await popup.mount.filter('zzzz')

  await expect(popup.mount.noMatches()).toBeVisible()
  await expect(popup.mount.noMatches()).toContainText('zzzz')
  await expect(
    page.getByText(/The library is empty|弹幕库里什么也没有/)
  ).toBeHidden()
  await expect(popup.mount.seasonItem(season.id)).toBeHidden()

  await popup.mount.clearFilter()

  await expect(popup.mount.seasonItem(season.id)).toBeVisible()
  await expect(popup.mount.noMatches()).toBeHidden()
})

test('an empty library keeps the empty-library prompt while filtering', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.filter('zzzz')

  await expect(
    page.getByText(/The library is empty|弹幕库里什么也没有/)
  ).toBeVisible()
  await expect(popup.mount.noMatches()).toBeHidden()
})
