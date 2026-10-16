import { createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { MigrationLegacyPopup } from '../../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { MIGRATION_EXTENSION_ID } from '../../setup/extensionKey'
import {
  migrationErrors,
  type PriorInstall,
  upgradeToCurrentBuild,
  withPriorInstall,
} from '../../setup/priorInstall'

/**
 * A user who set up a mount config in v1.5.0 keeps the in-page controller
 * after the extension updates in place. Restores the v1.5.0 backup fixture
 * (one enabled mount config), swaps to the current build without touching any
 * config, and asserts the floating button shows on a page the config matches.
 */

const BACKUP_GZ = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'migration',
  'backup.json.gz'
)
// The enabled mount config in the backup fixture matches this origin.
const MOUNT_CONFIG_URL = 'https://danmaku.weeblify.app/watch/'

test.setTimeout(90_000)

test('the controller shows on a mount config page right after an update', async (// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures arg
{}, testInfo) => {
  await withPriorInstall(testInfo, run)
})

async function run({
  context,
  consoleWatcher,
  currentExt,
  tmpRoot,
}: PriorInstall): Promise<void> {
  const backupPath = path.join(tmpRoot, 'backup.json')
  await pipeline(
    createReadStream(BACKUP_GZ),
    createGunzip(),
    createWriteStream(backupPath)
  )

  const legacyPopup = await MigrationLegacyPopup.open(
    context,
    MIGRATION_EXTENSION_ID
  )
  await legacyPopup.restoreBackup(backupPath)
  await legacyPopup.close()

  await upgradeToCurrentBuild(context, currentExt)

  const page = await context.newPage()
  const integrationPage = new IntegrationPage(page)
  await integrationPage.open(MOUNT_CONFIG_URL, 'native-video.html')
  await expect(integrationPage.floatingButton()).toBeVisible({
    timeout: 10_000,
  })

  expect(migrationErrors(consoleWatcher)).toEqual([])
}
