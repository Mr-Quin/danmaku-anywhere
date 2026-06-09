import type { BrowserContext } from '@playwright/test'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * Verifies the app bar "open in new" dropdown. The menu offers two choices,
 * "open in new window" spawns a popup-type browser window, and "open in new
 * tab" spawns a tab in the existing window. Both load the detached popup page.
 * The browser window count discriminates the two actions: only the window
 * choice adds a window.
 */

async function getWindowCount(context: BrowserContext): Promise<number> {
  const [sw] = context.serviceWorkers()
  const worker = sw ?? (await context.waitForEvent('serviceworker'))
  return worker.evaluate(() => chrome.windows.getAll().then((w) => w.length))
}

test('open in new window spawns a detached popup window', async ({
  context,
  page,
  extensionId,
}) => {
  const popup = await Popup.open(page, extensionId, '/mount')

  await popup.appBar.openOpenInNewMenu()
  await expect(popup.appBar.openInNewWindowItem()).toBeVisible()
  await expect(popup.appBar.openInNewTabItem()).toBeVisible()

  const windowsBefore = await getWindowCount(context)
  const detachedPagePromise = context.waitForEvent('page')
  await popup.appBar.openInNewWindowItem().click()

  const detached = await detachedPagePromise
  await expect(detached).toHaveURL(/pages\/popup\.html\?detached=1/)
  await expect.poll(() => getWindowCount(context)).toBe(windowsBefore + 1)
})

test('open in new tab spawns a detached tab without a new window', async ({
  context,
  page,
  extensionId,
}) => {
  const popup = await Popup.open(page, extensionId, '/mount')

  await popup.appBar.openOpenInNewMenu()
  const windowsBefore = await getWindowCount(context)
  const pagesBefore = context.pages().length
  const detachedPagePromise = context.waitForEvent('page')
  await popup.appBar.openInNewTabItem().click()

  const detached = await detachedPagePromise
  await expect(detached).toHaveURL(/pages\/popup\.html\?detached=1/)
  expect(context.pages().length).toBe(pagesBefore + 1)
  await expect.poll(() => getWindowCount(context)).toBe(windowsBefore)
})
