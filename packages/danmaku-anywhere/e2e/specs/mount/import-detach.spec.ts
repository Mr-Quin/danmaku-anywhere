import { ImportResultDialog } from '../../pom/ImportResultDialog'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Two halves of the detach contract that the unit test for
 * shouldDetachImport can't exercise:
 *   1. When popup.html is open as a tab (Playwright's only way to reach it),
 *      clicking Import must fire the local OS picker and must NOT spawn a new
 *      chrome.windows.create popup. This pins the useIsInTab branch.
 *   2. The /import route itself renders the standalone page (PopupLayout fills
 *      the viewport, HiddenImportInputs accept files, the result dialog drives
 *      the full import pipeline into the custom-episodes table).
 */

test('popup opened as a tab runs the picker in place, no detach window', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/mount')

  const newPagePromise = context
    .waitForEvent('page', { timeout: 1000 })
    .catch(() => null)
  const fileChooserPromise = page.waitForEvent('filechooser')

  await popup.mount.openToolbarMenu('import')

  const chooser = await fileChooserPromise
  expect(chooser.isMultiple()).toBe(true)

  const newPage = await newPagePromise
  expect(newPage).toBeNull()
})

test('/import route renders standalone and runs a full file import', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {})

  await page.goto(
    `chrome-extension://${extensionId}/pages/popup.html?detached=1#/import`
  )
  await page.locator('#root').waitFor({ state: 'visible' })

  await expect(
    page.getByRole('button', { name: /^(Pick files|选择文件)$/ })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^(Pick folder|选择文件夹)$/ })
  ).toBeVisible()

  const fileInput = page.locator('input[type="file"][accept]')
  await fileInput.setInputFiles({
    name: 'episode.xml',
    mimeType: 'text/xml',
    buffer: Buffer.from(loadTextFixture('bilibili-xml.xml')),
  })

  const importResult = new ImportResultDialog(page)
  await importResult.confirm()

  await expect(
    page.locator('[role="alert"]').filter({
      hasText: /Successfully imported|成功导入/,
    })
  ).toBeVisible()

  const customs = await da.episode.listCustom()
  expect(customs).toHaveLength(1)
  expect(customs[0].title).toBe('episode.xml')
})
