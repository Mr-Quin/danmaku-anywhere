import {
  CONTENT_SIZED_POPUP_SIZE,
  DESKTOP_POPUP_SIZE,
} from '../../../src/popup/utils/popupSize'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { emulatePlatform } from '../../setup/platform'

/**
 * Popup layout size per host. On Android the popup fills a phone sized
 * viewport in either orientation, but a host that sizes the popup bubble to
 * its content starts at Chromium's 25px floor, where the layout must fall
 * back to a fixed usable box. Desktop keeps its fixed box. Asserts the
 * rendered layout box in each case.
 */

const COLLAPSED = { width: 25, height: 25 }
const PORTRAIT = { width: 360, height: 640 }
const LANDSCAPE = { width: 800, height: 360 }

async function openAt(
  page: import('@playwright/test').Page,
  extensionId: string,
  viewport: { width: number; height: number }
) {
  await page.setViewportSize(viewport)
  const popup = await Popup.open(page, extensionId, '/mount')
  await expect(popup.layoutBox()).toBeVisible()
  return popup.layoutBox().boundingBox()
}

test('android popup keeps a usable size in a content-sized host', async ({
  context,
  page,
  extensionId,
}) => {
  await emulatePlatform(context, 'android')
  const box = await openAt(page, extensionId, COLLAPSED)
  expect(box?.width).toBe(CONTENT_SIZED_POPUP_SIZE.width)
  expect(box?.height).toBe(CONTENT_SIZED_POPUP_SIZE.height)
})

test('android popup fills a portrait phone viewport', async ({
  context,
  page,
  extensionId,
}) => {
  await emulatePlatform(context, 'android')
  const box = await openAt(page, extensionId, PORTRAIT)
  expect(box?.width).toBe(PORTRAIT.width)
  expect(box?.height).toBe(PORTRAIT.height)
})

test('android popup fills a landscape phone viewport', async ({
  context,
  page,
  extensionId,
}) => {
  await emulatePlatform(context, 'android')
  const box = await openAt(page, extensionId, LANDSCAPE)
  expect(box?.width).toBe(LANDSCAPE.width)
  expect(box?.height).toBe(LANDSCAPE.height)
})

test('desktop popup keeps its fixed size', async ({ page, extensionId }) => {
  const box = await openAt(page, extensionId, PORTRAIT)
  expect(box?.width).toBe(DESKTOP_POPUP_SIZE.width)
  expect(box?.height).toBe(DESKTOP_POPUP_SIZE.height)
})
