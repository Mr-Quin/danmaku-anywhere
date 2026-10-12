import { Popup } from '../../pom/Popup'
import { SearchPage } from '../../pom/SearchPage'
import { expect, test } from '../../setup/fixtures'

/**
 * Verifies popup route persistence: the active hash is written to
 * chrome.storage.session on navigation, restored on the next popup open
 * within the same session, and cleared when the stored path no longer
 * matches a known route (popup falls back to /mount). Restoration rebuilds
 * the URL hierarchy so back walks through ancestor routes. A page that needs
 * state the closed popup lost (season details, the config editor) reopens on
 * its parent, opening such a page without that state redirects to the parent,
 * and a popup opened at an explicit route stays there.
 */

async function openPopup(page: import('@playwright/test').Page, id: string) {
  await page.goto(`chrome-extension://${id}/pages/popup.html`)
  await page.locator('#root').waitFor({ state: 'visible' })
}

test('reopened popup lands on the last-visited route within the session', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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

  await page.goBack()
  await expect(page).toHaveURL(/#\/mount$/)
})

test('reopened popup at a nested route rebuilds back stack to ancestors', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await da.storage.setRaw(
    'session',
    'popup:lastRoute',
    '/config/integration-policy'
  )

  await openPopup(page, extensionId)
  await expect(page).toHaveURL(/#\/config\/integration-policy$/)

  await page.goBack()
  await expect(page).toHaveURL(/#\/config$/)

  await page.goBack()
  await expect(page).toHaveURL(/#\/mount$/)
})

test('reopened popup on a season page lands on search', async ({
  page,
  extensionId,
  da,
}) => {
  await da.storage.setRaw('session', 'popup:lastRoute', '/search/season')

  await openPopup(page, extensionId)
  await expect
    .poll(() => da.storage.get('session', 'popup:lastRoute'))
    .toBe('/search')
  await expect(page).toHaveURL(/#\/search$/)
  await expect(new SearchPage(page).input).toBeVisible()
})

test('reopened popup in the config editor lands on the config list', async ({
  page,
  extensionId,
  da,
}) => {
  await da.storage.setRaw('session', 'popup:lastRoute', '/config/edit')

  await openPopup(page, extensionId)
  await expect
    .poll(() => da.storage.get('session', 'popup:lastRoute'))
    .toBe('/config')
  await expect(page).toHaveURL(/#\/config$/)
  await expect(page.getByRole('button', { name: /^(Add|添加)$/ })).toBeVisible()
})

test('a season page opened without its season redirects to search', async ({
  page,
  extensionId,
}) => {
  await Popup.open(page, extensionId, '/search/season', { detached: true })

  await expect(page).toHaveURL(/#\/search$/)
  await expect(new SearchPage(page).input).toBeVisible()
})

test('an explicit route wins over the restored one', async ({
  page,
  extensionId,
  da,
}) => {
  await da.storage.setRaw('session', 'popup:lastRoute', '/styles')

  await Popup.open(page, extensionId, '/config')

  const addButton = page.getByRole('button', { name: /^(Add|添加)$/ })
  await expect(addButton).toBeVisible()
  // Restoring is async after load and leaves no trace when skipped, so give
  // it time to run before checking that the page did not move.
  await page.waitForTimeout(1_000)
  await expect(page).toHaveURL(/#\/config$/)
  await expect(addButton).toBeVisible()
})

test('invalid stored route is cleared and popup falls back to /mount', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await da.storage.setRaw('session', 'popup:lastRoute', '/this/does/not/exist')

  await openPopup(page, extensionId)
  await expect(page).toHaveURL(/#\/mount$/)
  await expect
    .poll(() => da.storage.get('session', 'popup:lastRoute'))
    .toBeNull()
})
