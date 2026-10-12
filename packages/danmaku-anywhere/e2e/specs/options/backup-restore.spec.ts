import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { Language } from '../../../src/common/localization/language'
import { Popup } from '../../pom/Popup'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'

/**
 * Restoring settings from a local backup file on /options/backup. Asserts the
 * restore asks for confirmation and changes nothing when cancelled, that a
 * file which is not a backup gets a readable error instead of validation
 * output, and that a partial restore names the failed settings by their page
 * names rather than their storage ids.
 */

const IMPORT_SUCCESS = /^(Import success|成功导入备份)$/

test.beforeEach(async ({ context }) => {
  await context.route('**/auth/get-session*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    })
  )
})

async function exportBackup(popup: Popup): Promise<Buffer> {
  const download = await popup.backup.exportToFile()
  return readFile(await download.path())
}

function jsonFile(name: string, buffer: Buffer) {
  return { name, mimeType: 'application/json', buffer }
}

async function openBackupPage(
  page: Page,
  extensionId: string,
  da: DaClient
): Promise<Popup> {
  await da.extensionOptions.update({
    lang: Language.en,
    retentionPolicy: { enabled: true, deleteCommentsAfter: 7 },
  })
  return Popup.open(page, extensionId, '/options/backup')
}

test('restoring a file asks first and changes nothing when cancelled', async ({
  page,
  extensionId,
  da,
}) => {
  const popup = await openBackupPage(page, extensionId, da)
  const backup = await exportBackup(popup)
  await da.extensionOptions.update({
    retentionPolicy: { enabled: true, deleteCommentsAfter: 30 },
  })

  await popup.backup.chooseRestoreFile(jsonFile('backup.json', backup))
  await popup.dialog.expectTitle(/^(Restore Settings\?|恢复设置？)$/)
  await popup.dialog.cancel()
  await popup.dialog.expectHidden()

  const afterCancel = await da.extensionOptions.get()
  expect(afterCancel.retentionPolicy.deleteCommentsAfter).toBe(30)

  await popup.backup.restoreFromFile(jsonFile('backup.json', backup))
  await popup.toast.expectSuccess(IMPORT_SUCCESS)

  const afterRestore = await da.extensionOptions.get()
  expect(afterRestore.retentionPolicy.deleteCommentsAfter).toBe(7)
})

test.describe('a file that is not a backup', () => {
  test.use({
    // The background logs the rejected file in full.
    expectedConsoleErrors: [/Error in RPC handler/],
  })

  test('gets a readable error instead of validation output', async ({
    page,
    extensionId,
    da,
  }) => {
    const popup = await openBackupPage(page, extensionId, da)

    await popup.backup.restoreFromFile(
      jsonFile('notes.json', Buffer.from(JSON.stringify({ hello: 'world' })))
    )

    await popup.toast.expectError(
      /^(This backup file is damaged or was not made by Danmaku Anywhere\.|此备份文件已损坏，或不是由弹幕任何地方创建的。)$/
    )
  })
})

test.describe('a backup with one unreadable store', () => {
  test.use({
    // ConfigStateService logs each store it refuses to restore.
    expectedConsoleErrors: [/Rejected backup data for danmakuOptions/],
  })

  test('names the settings that failed by their page names', async ({
    page,
    extensionId,
    da,
  }) => {
    const popup = await openBackupPage(page, extensionId, da)
    const backup = JSON.parse((await exportBackup(popup)).toString())
    backup.services.danmakuOptions.data = 'not settings'

    await popup.backup.restoreFromFile(
      jsonFile('backup.json', Buffer.from(JSON.stringify(backup)))
    )

    await popup.toast.expectError(
      /^(Some settings could not be restored: Danmaku Settings|部分设置未能恢复：弹幕设置)$/
    )
  })
})
