import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Import from URL: drives the toolbar 3-dot menu → URL dialog → fetch a
 * mocked .xml URL → ImportResultDialog → Confirm Import. Asserts the URL
 * dialog closes after submit, the success toast renders the file count,
 * and the custom episode lands in the DB with the URL's basename as title.
 */

const FETCH_URL = 'https://danmaku.invalid/episode.xml'

test('mount toolbar: import from URL fetches a mocked xml and stages a custom episode', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    network: [
      {
        pattern: FETCH_URL,
        respond: (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/xml',
            body: loadTextFixture('bilibili-xml.xml'),
          }),
      },
    ],
  })

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.openToolbarMenu('importUrl')

  await popup.urlImport.expectVisible()
  await popup.urlImport.fillUrl(FETCH_URL)
  await popup.urlImport.submit()

  await popup.urlImport.expectHidden()

  const confirm = page.locator('[data-testid="import-result-confirm"]')
  await expect(confirm).toBeVisible({ timeout: 5_000 })
  await confirm.click()

  await popup.toast.expectSuccess(/Successfully imported|成功导入/, {
    timeout: 10_000,
  })

  const customs = await da.episode.listCustom()
  expect(customs).toHaveLength(1)
  expect(customs[0].title).toBe('episode.xml')
  expect(customs[0].commentCount).toBeGreaterThan(0)
})

test('mount toolbar: import from URL renders an error when the URL 404s', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    network: [
      {
        pattern: FETCH_URL,
        respond: (route) =>
          route.fulfill({ status: 404, contentType: 'text/plain', body: '' }),
      },
    ],
  })

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.openToolbarMenu('importUrl')

  await popup.urlImport.expectVisible()
  await popup.urlImport.fillUrl(FETCH_URL)
  await popup.urlImport.submit()

  await expect(popup.urlImport.root).toBeVisible()
  await expect(popup.urlImport.root).toContainText(/404/, { timeout: 5_000 })

  expect(await da.episode.listCustom()).toHaveLength(0)
})
