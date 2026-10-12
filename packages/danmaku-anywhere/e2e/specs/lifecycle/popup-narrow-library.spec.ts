import type { Locator } from '@playwright/test'
import { Language } from '../../../src/common/localization/language'
import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { emulatePlatform } from '../../setup/platform'
import { applyProfile } from '../../setup/profile'

/**
 * The library on a 360 px phone popup in Chinese, with multiselect on. The
 * header fits without scrolling sideways and keeps its title whole, and the
 * selection bar's actions stay on one line instead of wrapping a character
 * per line. Asserts rendered geometry.
 */

async function overflowsSideways(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => el.scrollWidth > el.clientWidth)
}

test('library bars fit a 360 px popup in Chinese', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    extensionOptions: { lang: Language.zh },
  })
  const season = await da.season.add(makeBilibiliSeason())
  await da.episode.add(makeBilibiliEpisode(season.id))

  await emulatePlatform(context, 'android')
  await page.setViewportSize({ width: 360, height: 640 })
  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.enterMultiSelect()
  await popup.mount.selectAll()

  const toolbar = page.locator('.MuiToolbar-root').filter({
    has: popup.mount.multiselectToggle(),
  })
  const title = toolbar.getByRole('heading', { name: '弹幕库' })
  await expect(title).toBeVisible()
  expect(await overflowsSideways(toolbar)).toBe(false)
  expect(await overflowsSideways(title)).toBe(false)

  const deleteButton = popup.mount.bulkDeleteButton()
  await expect(deleteButton).toBeEnabled()
  const box = await deleteButton.boundingBox()
  expect(box?.height).toBeLessThanOrEqual(36)
})
