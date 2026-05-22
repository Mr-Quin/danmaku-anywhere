import { expect, test } from '../../setup/fixtures'

/**
 * Smoke checks that the extension boots: the service worker registers
 * with a 32-char extensionId and the popup / dashboard pages mount their
 * React root. No source-specific behavior is exercised here.
 */

test('extension service worker loads successfully', async ({ extensionId }) => {
  expect(extensionId).toBeTruthy()
  expect(extensionId).toMatch(/^[a-z]{32}$/)
})

test('popup page renders', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/pages/popup.html`)
  await expect(page.locator('#root')).toBeVisible()
})

test('dashboard page renders', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/pages/dashboard.html`)
  await expect(page.locator('#root')).toBeVisible()
})
