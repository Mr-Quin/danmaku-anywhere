import { createReadStream, createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'
import { stripBuiltinPrefix } from '@danmaku-anywhere/danmaku-converter'
import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import packageJson from '../../../package.json' with { type: 'json' }
import { DANMAKU_DB_NAME } from '../../../src/common/db/db'
import migrationConfig from '../../migration.config.json' with { type: 'json' }
import { mockCatalog } from '../../network/catalog'
import { MigrationLegacyPopup } from '../../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { attachConsoleWatcher } from '../../setup/console-watcher'
import { MIGRATION_EXTENSION_ID } from '../../setup/extensionKey'
import {
  ensureCurrentBuildForMigration,
  ensurePriorRelease,
} from '../../setup/priorRelease'
import { launchExtension, swapExtension } from '../../setup/swapExtension'

/**
 * Seeds real user state through v1.5.0's own popup (backup restore writes
 * chrome.storage, danmaku import writes IDB), swaps to the current build,
 * and asserts the upgrade chain ran without errors and preserved data.
 *
 * Two non-obvious mechanics, both documented in e2e/AGENTS.md:
 *   - userDataDir lives under os.tmpdir() to dodge Windows MAX_PATH.
 *   - The swap uses CDP Extensions.loadUnpacked, not relaunch.
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
const POPUP_TIMEOUT_MS = 5_000

// LogService IDB-quirk noise, unrelated to migration.
const IGNORED_ERROR_PATTERNS = [/Failed to save log/]

test.describe('migration swap', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120_000)

  test('prior install, seed via UI, swap, upgrade preserves seeded data', async (// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures arg
  {}, testInfo) => {
    const tmpRoot = path.join(
      os.tmpdir(),
      `da-mig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    )
    testInfo.annotations.push({ type: 'tmpRoot', description: tmpRoot })
    await fs.mkdir(tmpRoot, { recursive: true })

    let context: BrowserContext | undefined
    try {
      context = await runSwap(tmpRoot)
    } finally {
      await context?.close().catch(() => undefined)
      // Cleanup after context.close() so Windows file handles are released.
      await fs
        .rm(tmpRoot, { recursive: true, force: true })
        .catch(() => undefined)
    }
  })
})

async function runSwap(tmpRoot: string): Promise<BrowserContext> {
  const userDataDir = path.join(tmpRoot, 'profile')
  await fs.mkdir(userDataDir, { recursive: true })

  const [priorExt, currentExt, backupPath] = await Promise.all([
    ensurePriorRelease(migrationConfig.baselinePriorTag),
    ensureCurrentBuildForMigration(),
    gunzipTo(BACKUP_GZ, path.join(tmpRoot, 'backup.json')),
  ])

  const context = await launchExtension(userDataDir, priorExt)
  const consoleWatcher = attachConsoleWatcher(context)
  await stubReleaseNotes(context)
  // The prior build predates the manifest store, so the swapped-in current
  // build boots with an empty store and seeds from the catalog.
  const catalog = mockCatalog()
  await context.route(catalog.pattern, catalog.respond)

  const popup = await MigrationLegacyPopup.open(context, MIGRATION_EXTENSION_ID)
  await popup.restoreBackup(backupPath)
  await popup.importDanmaku(DANMAKU_ZIP)
  await popup.close()

  const seededProbe = await openProbePage(context)
  const seededSync = await readSyncSnapshot(seededProbe)
  const seededIdb = await readIdbCounts(seededProbe)
  const seededSeasonConfigIds = await readSeasonConfigIds(seededProbe)
  await seededProbe.close()
  expect(
    seededIdb.episodes + seededIdb.customEpisodes,
    'fixture should import at least one episode'
  ).toBeGreaterThan(0)
  expect(
    seededIdb.seasons,
    'fixture should import at least one season'
  ).toBeGreaterThan(0)
  // The prior release backfills season.providerConfigId with `builtin:*`, so
  // there is something for the v14 DB migration to strip.
  expect(
    seededSeasonConfigIds.some((id) => id.startsWith('builtin:')),
    'seeded seasons should carry builtin: provider ids'
  ).toBe(true)

  await swapExtension(context, currentExt)

  const probe = await openProbePage(context)
  const postSync = await readSyncSnapshot(probe)
  const postIdb = await readIdbCounts(probe)
  const postSeasonConfigIds = await readSeasonConfigIds(probe)
  const postCustomDdpBaseUrl = await readCustomDdpBaseUrl(probe)
  const postManifest = await probe.evaluate(
    () => chrome.runtime.getManifest().version
  )
  // ExtStorageService wraps stored values under their key, so the value
  // at chrome.storage.local['lastVersion'] is itself { lastVersion: '...' }.
  const postLastVersion = await probe.evaluate(async () => {
    const i = await chrome.storage.local.get('lastVersion')
    return i.lastVersion as { lastVersion?: string } | undefined
  })
  await probe.close()

  const errors = consoleWatcher
    .getErrors()
    .filter((e) => !IGNORED_ERROR_PATTERNS.some((p) => p.test(e)))
  expect(errors, 'console errors during migration swap').toEqual([])
  expect(postManifest).not.toBe(
    migrationConfig.baselinePriorTag.replace(/^v/, '')
  )
  expect(postLastVersion?.lastVersion).toBe(packageJson.version)
  // The upgrade strips the `builtin:` prefix from stored provider config ids,
  // so the seeded ids are expected to migrate to bare.
  const expectedProviderConfigIds = seededSync.providerConfigIds
    .map(stripBuiltinPrefix)
    .sort()
  expect(postSync.providerConfigIds, 'provider IDs migrated to bare').toEqual(
    expectedProviderConfigIds
  )
  expect(postSync.aiProviderConfigIds, 'AI provider IDs preserved').toEqual(
    seededSync.aiProviderConfigIds
  )
  expect(postIdb.seasons, 'season count preserved').toBeGreaterThanOrEqual(
    seededIdb.seasons
  )
  expect(postIdb.episodes, 'episode count preserved').toBeGreaterThanOrEqual(
    seededIdb.episodes
  )
  expect(
    postIdb.customEpisodes,
    'customEpisode count preserved'
  ).toBeGreaterThanOrEqual(seededIdb.customEpisodes)
  // The seeded custom DanDanPlay server stored baseUrl `.../api`; the manifest
  // now appends `/api/v2`, so the migration must drop the redundant suffix.
  expect(
    postCustomDdpBaseUrl,
    'custom DanDanPlay baseUrl had its /api suffix stripped'
  ).toBe('https://api.dandanplay.net')
  // The v14 DB migration must strip `builtin:` from season.providerConfigId,
  // and every season must still point at a provider config that exists.
  expect(
    postSeasonConfigIds.some((id) => id.startsWith('builtin:')),
    'no season retains a builtin: provider id'
  ).toBe(false)
  const configIds = new Set(postSync.providerConfigIds)
  for (const id of postSeasonConfigIds) {
    expect(
      configIds.has(id),
      `season provider id ${id} resolves to a config`
    ).toBe(true)
  }

  return context
}

async function openProbePage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.goto(
    `chrome-extension://${MIGRATION_EXTENSION_ID}/pages/popup.html`,
    { waitUntil: 'domcontentloaded', timeout: POPUP_TIMEOUT_MS }
  )
  await expect(page.locator('#root')).toBeVisible({ timeout: POPUP_TIMEOUT_MS })
  // Wait for the season tree to either render an entry or show the
  // empty-library state. Without this, render-time errors (zod parse,
  // missing fields read by SeasonTreeItem) land after we've already moved on.
  await page
    .waitForFunction(
      () =>
        Boolean(
          document.querySelector('[role="treeitem"]') ||
            document.body.textContent?.toLowerCase().includes('library')
        ),
      { timeout: POPUP_TIMEOUT_MS }
    )
    .catch(() => undefined)
  return page
}

// Both popups fetch the GitHub releases API on open via useLatestReleaseNotes;
// on CI that unauthenticated call hits a rate limit (403) that trips the console
// watcher. Stub just that one route (a blanket egress block hangs the legacy
// popup, which needs its other network calls). Everything else is left alone.
async function stubReleaseNotes(context: BrowserContext): Promise<void> {
  await context.route(
    /api\.github\.com\/repos\/[^/]+\/[^/]+\/releases\//,
    async (route) => {
      await route.fulfill({
        json: {
          name: '',
          body: '',
          html_url: 'https://release.invalid',
          published_at: '2020-01-01T00:00:00Z',
        },
      })
    }
  )
}

async function gunzipTo(src: string, dest: string): Promise<string> {
  await pipeline(createReadStream(src), createGunzip(), createWriteStream(dest))
  return dest
}

interface SyncSnapshot {
  providerConfigIds: string[]
  aiProviderConfigIds: string[]
}

async function readSyncSnapshot(page: Page): Promise<SyncSnapshot> {
  return page.evaluate(async () => {
    const sync = await chrome.storage.sync.get(null)
    const pc = sync.providerConfig as
      | { data?: Array<{ id?: string }> }
      | undefined
    const ai = sync.aiProviderConfig as
      | { data?: Array<{ id?: string }> }
      | undefined
    return {
      providerConfigIds: (pc?.data ?? []).map((p) => p.id ?? '?').sort(),
      aiProviderConfigIds: (ai?.data ?? []).map((p) => p.id ?? '?').sort(),
    }
  })
}

async function readCustomDdpBaseUrl(page: Page): Promise<string | undefined> {
  return page.evaluate(async () => {
    const sync = await chrome.storage.sync.get('providerConfig')
    const pc = sync.providerConfig as
      | {
          data?: Array<{
            isBuiltIn?: boolean
            manifestId?: string
            configValues?: { baseUrl?: string }
          }>
        }
      | undefined
    const custom = (pc?.data ?? []).find(
      (p) => p.isBuiltIn === false && p.manifestId === 'dandanplay'
    )
    return custom?.configValues?.baseUrl
  })
}

async function readSeasonConfigIds(page: Page): Promise<string[]> {
  return page.evaluate(
    (dbName) =>
      new Promise<string[]>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          try {
            const tx = db.transaction(['season'], 'readonly')
            const getAll = tx.objectStore('season').getAll()
            tx.oncomplete = () => {
              db.close()
              const ids = (
                getAll.result as Array<{ providerConfigId?: string }>
              )
                .map((s) => s.providerConfigId)
                .filter((id): id is string => typeof id === 'string')
              resolve([...new Set(ids)].sort())
            }
            tx.onerror = () => reject(tx.error)
          } catch (e) {
            db.close()
            reject(e)
          }
        }
      }),
    DANMAKU_DB_NAME
  )
}

interface IdbCounts {
  seasons: number
  episodes: number
  customEpisodes: number
}

async function readIdbCounts(page: Page): Promise<IdbCounts> {
  return page.evaluate(
    (dbName) =>
      new Promise<IdbCounts>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          // Single transaction; if any store is missing, db.transaction()
          // throws synchronously with NotFoundError naming the missing
          // store -- exactly the schema-regression signal this test exists
          // to surface.
          try {
            const tx = db.transaction(
              ['season', 'episode', 'customEpisode'],
              'readonly'
            )
            const seasonReq = tx.objectStore('season').count()
            const episodeReq = tx.objectStore('episode').count()
            const customReq = tx.objectStore('customEpisode').count()
            tx.oncomplete = () => {
              db.close()
              resolve({
                seasons: seasonReq.result,
                episodes: episodeReq.result,
                customEpisodes: customReq.result,
              })
            }
            tx.onerror = () => reject(tx.error)
          } catch (e) {
            db.close()
            reject(e)
          }
        }
      }),
    DANMAKU_DB_NAME
  )
}
