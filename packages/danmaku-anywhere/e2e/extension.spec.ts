import { expect, test } from './fixtures'

test('extension service worker loads successfully', async ({ extensionId }) => {
  expect(extensionId).toBeTruthy()
  expect(extensionId).toMatch(/^[a-z]{32}$/)
})

test('popup page renders', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/pages/popup.html`)
  await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 })
})

test('dashboard page renders', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/pages/dashboard.html`)
  await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 })
})
