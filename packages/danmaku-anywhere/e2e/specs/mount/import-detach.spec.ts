import { ImportResultDialog } from '../../pom/ImportResultDialog'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Three halves of the detach contract that the unit test for
 * shouldDetachImport can't exercise:
 *   1. When popup.html is open as a tab (Playwright's only way to reach it),
 *      clicking Import must fire the local OS picker and must NOT spawn a new
 *      chrome.windows.create popup. This pins the useIsInTab branch.
 *   2. The /import route itself renders the standalone page (PopupLayout fills
 *      the viewport, HiddenImportInputs accept files, the result dialog drives
 *      the full import pipeline into the custom-episodes table).
 *   3. After a /import write, an already-open /mount popup picks up the new
 *      episode without a manual reload (cross-window query invalidation via
 *      the data-change channel).
 */

test('popup opened as a tab runs the picker in place, no detach window', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/mount')

  const fileChooserPromise = page.waitForEvent('filechooser')
  const pageCountBefore = context.pages().length

  await popup.mount.openToolbarMenu('import')

  // The picker firing is the discriminating signal: the in-tab branch opens the
  // OS file chooser, the detach branch calls chrome.windows.create and never
  // does. So awaiting the chooser already proves no detach happened; the page
  // count then deterministically confirms no extra window, with no arbitrary
  // wait for an event that should never come.
  const chooser = await fileChooserPromise
  expect(chooser.isMultiple()).toBe(true)

  expect(context.pages()).toHaveLength(pageCountBefore)
})

test('/import route renders standalone and runs a full file import', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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
  await importResult.expectSuccess()

  const customs = await da.episode.listCustom()
  expect(customs).toHaveLength(1)
  expect(customs[0].title).toBe('episode.xml')
})

test('an open /mount popup refreshes when the /import window writes', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/mount')

  const seasonCustom = page.locator('[data-testid="tree-item-season-custom"]')
  await expect(seasonCustom).toBeHidden()

  const importTab = await context.newPage()
  await importTab.goto(
    `chrome-extension://${extensionId}/pages/popup.html?detached=1#/import`
  )
  await importTab.locator('#root').waitFor({ state: 'visible' })

  const fileInput = importTab.locator('input[type="file"][accept]')
  await fileInput.setInputFiles({
    name: 'cross-window.xml',
    mimeType: 'text/xml',
    buffer: Buffer.from(loadTextFixture('bilibili-xml.xml')),
  })

  const importResult = new ImportResultDialog(importTab)
  await importResult.confirm()
  await importResult.expectSuccess()

  const customs = await da.episode.listCustom()
  expect(customs).toHaveLength(1)

  await page.bringToFront()
  await expect(seasonCustom).toBeVisible({ timeout: 5_000 })
  await popup.mount.expandItem('season-custom')
  await expect(popup.mount.customEpisodeItem(customs[0].id)).toBeVisible()
})
