import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'

/**
 * Verifies popup route persistence: the active hash is written to
 * chrome.storage.session on navigation, restored on the next popup open
 * within the same session, and cleared when the stored path no longer
 * matches a known route (popup falls back to /mount). This is the
 * focus-loss reopen fix from DA-529 (issue #416).
 */

async function openPopup(page: import('@playwright/test').Page, id: string) {
  await page.goto(`chrome-extension://${id}/pages/popup.html`)
  await page.locator('#root').waitFor({ state: 'visible', timeout: 10_000 })
}

test('reopened popup lands on the last-visited route within the session', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)

  await openPopup(page, extensionId)
  await expect(page).toHaveURL(/#\/mount$/)

  await page.evaluate(() => {
    window.location.hash = '#/styles'
  })
  await expect(page).toHaveURL(/#\/styles$/)
  await expect
    .poll(() => da.storage.get('session', 'popup:lastRoute'))
    .toBe('/styles')

  await openPopup(page, extensionId)
  await expect(page).toHaveURL(/#\/styles$/)
})

test('invalid stored route is cleared and popup falls back to /mount', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)

  await da.storage.setRaw('session', 'popup:lastRoute', '/this/does/not/exist')

  await openPopup(page, extensionId)
  await expect(page).toHaveURL(/#\/mount$/)
  await expect
    .poll(() => da.storage.get('session', 'popup:lastRoute'))
    .toBeNull()
})
