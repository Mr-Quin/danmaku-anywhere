import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { Popup } from '../../pom/Popup'
import { MigrationLegacyPopup } from '../../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { MIGRATION_EXTENSION_ID } from '../../setup/extensionKey'
import {
  dismissReleaseNotes,
  readIdbRows,
  readOptionsSnapshot,
  schemaViolations,
} from '../../setup/migrationState'
import { migrationErrors, withPriorInstall } from '../../setup/priorInstall'
import { swapExtension } from '../../setup/swapExtension'

/**
 * A user who upgrades and then restores the backup they exported from v1.5.0.
 * Seeds v1.5.0 by restoring that backup and importing danmaku through its own
 * popup, swaps to the current build, and restores the same backup through the
 * current backup page. Asserts the success toast, that the providers page still
 * lists each source once with the user's disabled source off, and that every
 * options store comes out exactly as the upgrade left it and still parses.
 */

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'migration'
)
const BACKUP_GZ = path.join(FIXTURES_DIR, 'backup.json.gz')
const DANMAKU_ZIP = path.join(FIXTURES_DIR, 'danmaku.zip')

test.setTimeout(120_000)

test('restoring the v1.5.0 backup on an upgraded install leaves it consistent', async (// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures arg
{}, testInfo) => {
  await withPriorInstall(
    testInfo,
    async ({ context, consoleWatcher, currentExt, tmpRoot }) => {
      const backup = gunzipSync(await readFile(BACKUP_GZ))
      const backupPath = path.join(tmpRoot, 'backup.json')
      await writeFile(backupPath, backup)

      const legacy = await MigrationLegacyPopup.open(
        context,
        MIGRATION_EXTENSION_ID
      )
      await legacy.restoreBackup(backupPath)
      await legacy.importDanmaku(DANMAKU_ZIP)
      await legacy.close()

      await swapExtension(context, currentExt)

      const page = await context.newPage()
      let popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/providers')
      await dismissReleaseNotes(page)
      await expect(popup.providers.installedHeading(4)).toBeVisible()
      const upgraded = await readOptionsSnapshot(page)
      const seasonsBefore = await readIdbRows<{ id: number }>(page, 'season')

      popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/options/backup')
      await popup.backup.restoreFromFile({
        name: 'backup.json',
        mimeType: 'application/json',
        buffer: backup,
      })
      await popup.toast.expectSuccess(/^(Import success|成功导入备份)$/)

      popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/providers')
      await expect(popup.providers.installedHeading(4)).toBeVisible()
      await expect(
        popup.providers.enabledSwitch(/Tencent|腾讯/)
      ).not.toBeChecked()

      const restored = await readOptionsSnapshot(page)
      expect(
        await schemaViolations(page, restored),
        'every options store parses against its current schema'
      ).toEqual({})
      expect(
        restored,
        'restoring the backup the install came from changes no store'
      ).toEqual(upgraded)
      expect(
        (await readIdbRows<{ id: number }>(page, 'season')).length,
        'a settings restore leaves the library alone'
      ).toBe(seasonsBefore.length)

      expect(
        migrationErrors(consoleWatcher),
        'console errors during the upgrade and restore'
      ).toEqual([])
    }
  )
})
