import type { BrowserContext } from '@playwright/test'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * Verifies the app bar "open in new" dropdown. The menu offers two choices,
 * "open in new window" spawns a popup-type browser window, and "open in new
 * tab" spawns a tab in the existing window. Both load the detached popup page
 * on the route the popup was showing. The browser window count discriminates
 * the two actions: only the window choice adds a window. A detached page
 * opened for a tab reads that tab, not itself, when checking whether the page
 * can host danmaku.
 */

async function getWindowCount(context: BrowserContext): Promise<number> {
  const [sw] = context.serviceWorkers()
  const worker = sw ?? (await context.waitForEvent('serviceworker'))
  return worker.evaluate(() => chrome.windows.getAll().then((w) => w.length))
}

async function getTabId(
  context: BrowserContext,
  urlPattern: string
): Promise<number> {
  const [sw] = context.serviceWorkers()
  const worker = sw ?? (await context.waitForEvent('serviceworker'))
  const tabId = await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url })
    return tab?.id
  }, urlPattern)
  if (tabId === undefined) {
    throw new Error(`No tab matches ${urlPattern}`)
  }
  return tabId
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

test('open in new tab keeps the current route', async ({
  context,
  page,
  extensionId,
}) => {
  const popup = await Popup.open(page, extensionId, '/config')

  await expect(
    page.getByRole('button', { name: /^(Settings|设置)$/ })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^(Switch to .+ theme|切换到.+主题)$/ })
  ).toBeVisible()

  await popup.appBar.openOpenInNewMenu()
  const detachedPagePromise = context.waitForEvent('page')
  await popup.appBar.openInNewTabItem().click()

  const detached = await detachedPagePromise
  await expect(detached).toHaveURL(/pages\/popup\.html\?detached=1.*#\/config$/)
})

test('a detached page checks the tab it was opened for', async ({
  context,
  page,
  extensionId,
}) => {
  await new IntegrationPage(page).open(
    'https://da-test.invalid/watch/',
    'native-video.html'
  )
  const videoTabId = await getTabId(context, 'https://da-test.invalid/*')

  const detached = await context.newPage()
  await Popup.open(detached, extensionId, '/mount', {
    detached: true,
    tabId: videoTabId,
  })

  await expect(
    detached.getByText(/^(No mount config for this site|该网站暂无装填配置)$/)
  ).toBeVisible()
})
