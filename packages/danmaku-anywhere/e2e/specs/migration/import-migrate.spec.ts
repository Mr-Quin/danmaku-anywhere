import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { ImportResultDialog } from '../../pom/ImportResultDialog'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'

/**
 * Migrate-on-import: the current build ingests a v1.5.0 backup and danmaku
 * export and migrates them on the way in (restoreState -> options.upgrade,
 * parseBackupMany -> episode v1->v4). Complements migration-smoke, which only
 * exercises startup migration of already-stored data. Asserts the restore
 * success toast and the danmaku import-result success, then that the imported
 * config and danmaku land in the current schema (bare provider ids, stripped
 * custom DanDanPlay baseUrl, resolvable season provider ids).
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

// The backup page mounts the cloud-backup section, which reads the auth
// session over the network. Stub it to "no session" so the page renders signed
// out without a live backend call.
test.beforeEach(async ({ context }) => {
  await context.route('**/auth/get-session*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    })
  )
})

test('current build migrates an imported v1.5.0 backup and danmaku export', async ({
  context,
  page,
  extensionId,
}) => {
  const popup = await Popup.open(page, extensionId, '/options/backup')

  const backup = gunzipSync(await readFile(BACKUP_GZ))
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: backup,
  })
  await popup.toast.expectSuccess(/Import success|成功导入备份/)

  await page.goto(
    `chrome-extension://${extensionId}/pages/popup.html?detached=1#/import`
  )
  await page.locator('#root').waitFor({ state: 'visible' })
  await page.locator('input[type="file"][accept]').setInputFiles(DANMAKU_ZIP)
  await new ImportResultDialog(page).confirm()
  // The danmaku fixture carries a ~2MB comment file that is parsed and
  // migrated before the success alert renders, so allow more than the default.
  await expect(
    page
      .locator('[role="alert"]')
      .filter({ hasText: /Successfully imported|成功导入/ })
  ).toBeVisible({ timeout: 15_000 })

  const da = await getDaClient(context)

  const providers = await da.providerConfig.list()
  expect(providers.length).toBeGreaterThan(0)
  expect(
    providers.filter((p) => p.id.startsWith('builtin:')),
    'provider config ids migrated to bare'
  ).toEqual([])
  const ddpBaseUrls = providers
    .filter((p) => p.isBuiltIn === false && p.manifestId === 'dandanplay')
    .map((p) => p.configValues.baseUrl as string | undefined)
  expect(
    ddpBaseUrls,
    'restored custom DanDanPlay baseUrl had its /api suffix stripped'
  ).toContain('https://api.dandanplay.net')
  for (const url of ddpBaseUrls) {
    expect(
      url?.endsWith('/api'),
      `${url} should not retain a /api suffix`
    ).toBe(false)
  }

  const seasons = await da.season.list()
  expect(seasons.length, 'seasons imported').toBeGreaterThan(0)
  const customEpisodes = await da.episode.listCustom()
  expect(customEpisodes.length, 'custom danmaku imported').toBeGreaterThan(0)
  const providerIds = new Set(providers.map((p) => p.id))
  for (const season of seasons) {
    expect(
      providerIds.has(season.providerConfigId),
      `season provider id ${season.providerConfigId} resolves to a config`
    ).toBe(true)
  }
})
