import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import type { Download } from '@playwright/test'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * Restores the v1.5.0 backup, exports it, and restores the export, which holds
 * the migrated data at the current store versions. Asserts the success toast
 * on both restores and that a second export yields the same services.
 */

const BACKUP_GZ = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'migration',
  'backup.json.gz'
)

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

async function readDownload(download: Download): Promise<Buffer> {
  return readFile(await download.path())
}

test('a backup exported after restoring the v1.5.0 backup restores cleanly', async ({
  page,
  extensionId,
}) => {
  const popup = await Popup.open(page, extensionId, '/options/backup')
  await popup.backup.restoreFromFile({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: gunzipSync(await readFile(BACKUP_GZ)),
  })
  await popup.toast.expectSuccess(IMPORT_SUCCESS)

  const migrated = await readDownload(await popup.backup.exportToFile())

  const reopened = await Popup.open(page, extensionId, '/options/backup')
  await reopened.backup.restoreFromFile({
    name: 'reexport.json',
    mimeType: 'application/json',
    buffer: migrated,
  })
  await reopened.toast.expectSuccess(IMPORT_SUCCESS)

  const restored = await readDownload(await reopened.backup.exportToFile())

  expect(JSON.parse(restored.toString()).services).toEqual(
    JSON.parse(migrated.toString()).services
  )
})
