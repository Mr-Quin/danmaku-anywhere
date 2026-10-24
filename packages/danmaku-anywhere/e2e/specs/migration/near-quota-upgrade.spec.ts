import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { Popup } from '../../pom/Popup'
import { MigrationLegacyPopup } from '../../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { MIGRATION_EXTENSION_ID } from '../../setup/extensionKey'
import {
  dismissReleaseNotes,
  readOptionsSnapshot,
} from '../../setup/migrationState'
import {
  migrationErrors,
  type PriorInstall,
  upgradeToCurrentBuild,
  withPriorInstall,
} from '../../setup/priorInstall'

/**
 * A v1.5.0 user whose danmakuOptions sync item is just under Chrome's 8 KB
 * item limit, from a long block list, upgrades to the current build. The popup
 * gets past the upgrade screen, the Block tab lists their first and last
 * rules, every rule survives with nothing else lost, and no sync item ends up
 * over the limit.
 */

const BACKUP_GZ = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'migration',
  'backup.json.gz'
)
const ITEM_LIMIT = 8192
const TARGET_ITEM_BYTES = 7950

interface Rule {
  type: 'text' | 'regex'
  value: string
  enabled: boolean
}

interface StoredDanmakuOptions {
  version: number
  data: { filters: Rule[]; customCss: string }
}

const encoder = new TextEncoder()

// Chrome counts the key plus the JSON value; nothing seeded here contains a
// character its JSON writer escapes differently.
function itemBytes(key: string, value: unknown): number {
  return (
    encoder.encode(key).length + encoder.encode(JSON.stringify(value)).length
  )
}

function rule(index: number): Rule {
  return index % 4 === 0
    ? { type: 'regex', value: `^前方高能${index}$`, enabled: true }
    : { type: 'text', value: `剧透关键词${index}`, enabled: index % 3 !== 0 }
}

// The v1.5.0 fixture backup with its danmakuOptions grown by block rules
// until the stored item is just under the limit.
async function writeNearQuotaBackup(tmpRoot: string) {
  const backup = JSON.parse(gunzipSync(await fs.readFile(BACKUP_GZ)).toString())
  const danmakuOptions = backup.services.danmakuOptions as StoredDanmakuOptions
  const { filters } = danmakuOptions.data
  while (itemBytes('danmakuOptions', danmakuOptions) < TARGET_ITEM_BYTES) {
    filters.push(rule(filters.length))
  }
  const file = path.join(tmpRoot, 'near-quota-backup.json')
  await fs.writeFile(file, JSON.stringify(backup))
  return { file, seeded: danmakuOptions }
}

async function readSyncItemBytes(page: Page): Promise<Record<string, number>> {
  const sync = await page.evaluate(() => chrome.storage.sync.get(null))
  return Object.fromEntries(
    Object.entries(sync).map(([key, value]) => [key, itemBytes(key, value)])
  )
}

test.setTimeout(120_000)

test('a v1.5.0 block list just under the sync item limit survives the upgrade', async (// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures arg
{}, testInfo) => {
  await withPriorInstall(testInfo, run)
})

async function run({
  context,
  consoleWatcher,
  currentExt,
  tmpRoot,
}: PriorInstall): Promise<void> {
  const { file, seeded } = await writeNearQuotaBackup(tmpRoot)
  const legacyPopup = await MigrationLegacyPopup.open(
    context,
    MIGRATION_EXTENSION_ID
  )
  await legacyPopup.restoreBackup(file)
  await legacyPopup.close()

  await upgradeToCurrentBuild(context, currentExt)

  const page = await context.newPage()
  await page.goto(
    `chrome-extension://${MIGRATION_EXTENSION_ID}/pages/popup.html`,
    { waitUntil: 'domcontentloaded' }
  )
  await page.locator('#root').waitFor({ state: 'visible' })
  await dismissReleaseNotes(page)
  const popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/styles')
  await popup.danmakuSettings.openBlockTab()

  const { filters } = seeded.data
  await expect(popup.danmakuSettings.blockRule(filters[0])).toBeVisible()
  await expect(
    popup.danmakuSettings.blockRule(filters.at(-1) as Rule)
  ).toBeVisible()

  const upgraded = await readOptionsSnapshot(page)
  expect(upgraded.danmakuOptions?.data).toMatchObject({
    filters,
    customCss: seeded.data.customCss,
  })
  for (const [key, bytes] of Object.entries(await readSyncItemBytes(page))) {
    expect(bytes, `sync item ${key}`).toBeLessThanOrEqual(ITEM_LIMIT)
  }
  expect(migrationErrors(consoleWatcher), 'console errors').toEqual([])
}
