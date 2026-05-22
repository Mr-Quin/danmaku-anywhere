import { expect, test } from '../../setup/fixtures'

/**
 * E2E builds ship the dev watermark so test failures captured in
 * screenshots/video are unambiguously not from a production extension.
 * Asserts the popup renders the mode badge (E2E) and the version badge.
 */

test('popup shows E2E watermark with version', async ({
  page,
  extensionId,
}) => {
  await page.goto(`chrome-extension://${extensionId}/pages/popup.html`)
  await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 })

  await expect(page.getByText('E2E', { exact: true })).toBeVisible()
  await expect(page.getByText(/^v\d+\.\d+\.\d+/)).toBeVisible()
})
