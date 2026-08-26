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
import { computeNamespaceKey } from '../../../src/common/providers/namespaceKey'
import migrationConfig from '../../migration.config.json' with { type: 'json' }
import { mockCatalog } from '../../network/catalog'
import { ImportPage } from '../../pom/ImportPage'
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

// Mirrors the checked-in backup fixture: the self-hosted DanDanPlay server the
// upgrade must keep on its own namespace, and the season it owns.
const SELF_HOSTED_DDP_BASE_URL = 'https://ddp.selfhosted.example'
const SELF_HOSTED_DDP_CONFIG_ID = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'
const SELF_HOSTED_SEASON_INDEXED_ID = '90001'
const PUBLIC_COMPAT_DDP_BASE_URL = 'https://danmu.selfhosted.example'

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
  await seedSelfHostedSeason(context)

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
  const postSeasonIdentity = await readSeasonNamespaceKeys(probe)
  const postCustomDdpConfigs = await readCustomDdpConfigs(probe)
  const postMacCmsConfig = await readMacCmsConfig(probe)
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
  assertCustomDdpConfigs(postCustomDdpConfigs)
  assertMacCmsConfig(postMacCmsConfig)
  // v15 deletes the legacy provider / providerConfigId fields from every season
  // row. readSeasonConfigIds reads providerConfigId, so it must come back empty.
  expect(
    postSeasonConfigIds,
    'no season retains a providerConfigId after v15'
  ).toEqual([])
  for (const row of postSeasonIdentity) {
    expect(row.hasProvider, `season ${row.id} dropped its provider field`).toBe(
      false
    )
    expect(
      row.hasProviderConfigId,
      `season ${row.id} dropped its providerConfigId field`
    ).toBe(false)
  }
  expect(
    postSeasonIdentity.length,
    'fixture should have at least one season'
  ).toBeGreaterThan(0)
  const selfHosted = postCustomDdpConfigs.find((config) => {
    return config.configValues?.baseUrl === SELF_HOSTED_DDP_BASE_URL
  })
  if (!selfHosted) {
    throw new Error('the fixture must carry a self-hosted DanDanPlay config')
  }
  const selfHostedNamespace = computeNamespaceKey(selfHosted, ['baseUrl'])
  expect(
    selfHostedNamespace,
    'a self-hosted config hashes to a ns: namespaceKey, distinct from a builtin'
  ).toMatch(/^ns:/)

  // Seasons the self-hosted server owns must keep its namespace. Deriving one
  // before the manifest registry has loaded the dandanplay declaration would
  // collapse them onto the shared public `dandanplay` namespace and drop the
  // providerConfigId that could ever correct them.
  const selfHostedSeasons = postSeasonIdentity.filter((row) => {
    return row.namespaceKey === selfHostedNamespace
  })
  expect(
    selfHostedSeasons.map((row) => row.indexedId),
    'the self-hosted season kept its own namespace'
  ).toEqual([SELF_HOSTED_SEASON_INDEXED_ID])

  for (const row of postSeasonIdentity) {
    expect(
      row.manifestId,
      `season ${row.id} backfilled a manifestId`
    ).toBeTruthy()
    expect(
      ['dandanplay', 'bilibili', 'tencent'],
      `season ${row.id} healed to a known manifestId`
    ).toContain(row.manifestId)
    if (row.indexedId === SELF_HOSTED_SEASON_INDEXED_ID) {
      expect(
        row.namespaceKey,
        `season ${row.id} keys to the self-hosted namespace`
      ).toBe(selfHostedNamespace)
      continue
    }
    expect(
      row.namespaceKey,
      `season ${row.id} namespaceKey equals its manifestId`
    ).toBe(row.manifestId)
  }

  await assertPostMigrationReimport(context)

  return context
}

// Post-migration sanity: re-importing the original backup into the upgraded DB
// must behave under the new identity rules. Built-in seasons dedup against the
// migrated rows (no duplicates), and the self-hosted entry re-imports as a fresh
// orphan: not dropped on a nullish-identity lookup, not mislabeled as a builtin.
async function assertPostMigrationReimport(
  context: BrowserContext
): Promise<void> {
  const page = await context.newPage()
  const importPage = await ImportPage.open(page, MIGRATION_EXTENSION_ID)
  const before = await readIdbCounts(page)

  await importPage.selectFiles(DANMAKU_ZIP)
  await importPage.result.confirm()
  await importPage.result.expectSuccess()

  const after = await readIdbCounts(page)
  const identities = await readSeasonNamespaceKeys(page)
  await page.close()

  const orphans = identities.filter((s) => !s.manifestId)
  expect(orphans.length, 'self-hosted entry re-imported as an orphan').toBe(1)
  expect(
    after.seasons,
    'built-in seasons dedup; only the orphan is added'
  ).toBe(before.seasons + 1)
}

async function openProbePage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.goto(
    `chrome-extension://${MIGRATION_EXTENSION_ID}/pages/popup.html`,
    { waitUntil: 'domcontentloaded', timeout: POPUP_TIMEOUT_MS }
  )
  await expect(page.locator('#root')).toBeVisible({ timeout: POPUP_TIMEOUT_MS })
  // The fixture always seeds seasons, so a healthy popup renders the season
  // tree. A render-time error (zod parse, a field SeasonTreeItem reads going
  // missing) leaves no tree item; this gate fails the test instead of letting
  // the probe move on half-rendered.
  await expect(page.locator('[role="treeitem"]').first()).toBeVisible({
    timeout: POPUP_TIMEOUT_MS,
  })
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

interface StoredProviderConfig {
  id: string
  manifestId: string
  configValues?: Record<string, unknown>
}

async function readProviderConfigs(
  page: Page
): Promise<StoredProviderConfig[]> {
  return page.evaluate(async () => {
    const sync = await chrome.storage.sync.get('providerConfig')
    const pc = sync.providerConfig as
      | {
          data?: Array<{
            id?: string
            manifestId?: string
            configValues?: Record<string, unknown>
          }>
        }
      | undefined
    return (pc?.data ?? [])
      .filter(
        (p) => typeof p.id === 'string' && typeof p.manifestId === 'string'
      )
      .map((p) => ({
        id: p.id as string,
        manifestId: p.manifestId as string,
        configValues: p.configValues,
      }))
  })
}

// The hosted built-in DDP keeps id === manifestId; every custom server (the
// fixture has two) has its own distinct id.
async function readCustomDdpConfigs(
  page: Page
): Promise<StoredProviderConfig[]> {
  const configs = await readProviderConfigs(page)
  return configs.filter((config) => {
    return config.manifestId === 'dandanplay' && config.id !== 'dandanplay'
  })
}

async function readMacCmsConfig(
  page: Page
): Promise<StoredProviderConfig | undefined> {
  const configs = await readProviderConfigs(page)
  return configs.find((config) => config.manifestId === 'legacy:maccms')
}

// Both seeded DanDanPlayCompatible servers must survive with their content
// intact, not just their ids. The v1.5.0 shape had no first-class
// appId/appSecret, so a self-hosted key pair lived in auth.headers; losing it
// silently breaks every request that server signs.
function assertCustomDdpConfigs(configs: StoredProviderConfig[]): void {
  const byBaseUrl = new Map(
    configs.map((config) => [config.configValues?.baseUrl, config])
  )
  expect(
    [...byBaseUrl.keys()].sort(),
    'both seeded custom DanDanPlay servers survived, /api suffix stripped'
  ).toEqual([PUBLIC_COMPAT_DDP_BASE_URL, SELF_HOSTED_DDP_BASE_URL].sort())

  expect(
    byBaseUrl.get(SELF_HOSTED_DDP_BASE_URL)?.configValues?.auth,
    'the self-hosted server kept its custom API key headers'
  ).toEqual({
    enabled: true,
    headers: [
      { key: 'X-AppId', value: 'REDACTED_SECRET' },
      { key: 'X-AppSecret', value: 'REDACTED_SECRET' },
    ],
  })
  expect(
    byBaseUrl.get(PUBLIC_COMPAT_DDP_BASE_URL)?.configValues?.auth,
    'the unauthenticated compatible server kept its empty auth block'
  ).toEqual({ enabled: false, headers: [] })
}

function assertMacCmsConfig(config: StoredProviderConfig | undefined): void {
  expect(
    config?.configValues,
    'the MacCMS config kept every field, not just its id'
  ).toEqual({
    danmakuBaseUrl: 'https://vod.selfhosted.example/danmaku',
    danmuicuBaseUrl: 'https://vod.selfhosted.example/danmuicu',
    stripColor: false,
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

interface SeasonIdentityRow {
  id: number
  indexedId?: string
  manifestId?: string
  namespaceKey?: string
  hasProvider: boolean
  hasProviderConfigId: boolean
}

async function readSeasonNamespaceKeys(
  page: Page
): Promise<SeasonIdentityRow[]> {
  return page.evaluate(
    (dbName) =>
      new Promise<SeasonIdentityRow[]>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          try {
            const tx = db.transaction(['season'], 'readonly')
            const getAll = tx.objectStore('season').getAll()
            tx.oncomplete = () => {
              db.close()
              const seasons = getAll.result as Array<{
                id: number
                indexedId?: string
                manifestId?: string
                namespaceKey?: string
                provider?: unknown
                providerConfigId?: unknown
              }>
              resolve(
                seasons.map((s) => ({
                  id: s.id,
                  indexedId: s.indexedId,
                  manifestId: s.manifestId,
                  namespaceKey: s.namespaceKey,
                  hasProvider: 'provider' in s,
                  hasProviderConfigId: 'providerConfigId' in s,
                }))
              )
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

// v1.5.0's danmaku import rewrites every imported season's providerConfigId to
// the builtin for its provider tag, so no UI route can produce a season owned
// by a self-hosted server. Write the v14 row directly instead; the swap still
// runs the real v15 migration and the real runtime reconciler over it.
async function seedSelfHostedSeason(context: BrowserContext): Promise<void> {
  const page = await context.newPage()
  await page.goto(
    `chrome-extension://${MIGRATION_EXTENSION_ID}/pages/popup.html`,
    { waitUntil: 'domcontentloaded', timeout: POPUP_TIMEOUT_MS }
  )
  await page.evaluate(
    ([dbName, configId, indexedId]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction(['season'], 'readwrite')
          tx.objectStore('season').add({
            provider: 'DanDanPlay',
            providerConfigId: configId,
            title: 'Self Hosted Show',
            type: 'tvseries',
            providerIds: { animeId: 90001, bangumiId: '90001' },
            indexedId,
            year: 2024,
            episodeCount: 1,
            schemaVersion: 1,
            timeUpdated: 1774975920084,
            version: 1,
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            reject(tx.error)
          }
        }
      }),
    [
      DANMAKU_DB_NAME,
      SELF_HOSTED_DDP_CONFIG_ID,
      SELF_HOSTED_SEASON_INDEXED_ID,
    ] as const
  )
  await page.close()
}
