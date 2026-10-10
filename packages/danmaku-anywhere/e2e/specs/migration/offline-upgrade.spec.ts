import { createReadStream, createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'
import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { DANMAKU_DB_NAME } from '../../../src/common/db/db'
import { computeNamespaceKey } from '../../../src/common/providers/namespaceKey'
import migrationConfig from '../../migration.config.json' with { type: 'json' }
import { mockCatalog, offlineCatalog } from '../../network/catalog'
import { mockDandanplay } from '../../network/dandanplay'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import { MigrationLegacyPopup } from '../../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { attachConsoleWatcher } from '../../setup/console-watcher'
import { MIGRATION_EXTENSION_ID } from '../../setup/extensionKey'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import {
  ensureCurrentBuildForMigration,
  ensurePriorRelease,
} from '../../setup/priorRelease'
import { launchExtension, swapExtension } from '../../setup/swapExtension'

/**
 * A user upgrading while the manifest catalog proxy is unreachable (a
 * blocked network, a downed backend) must still land on a working install.
 * Swaps a real v1.5.0 profile to HEAD with the catalog dead throughout:
 * asserts the bundled fallback registers all 13 manifests, a built-in
 * source can still fetch fresh danmaku through the mocked provider API, the
 * self-hosted DanDanPlay season keeps its own namespace instead of
 * collapsing onto the shared built-in one, and a later reachable sync
 * reconciles on top of the offline state with no duplicate rows and no
 * re-seeded provider configs.
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

// Mirrors the checked-in backup/danmaku fixtures.
const SELF_HOSTED_DDP_CONFIG_ID = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'
const SELF_HOSTED_SEASON_INDEXED_ID = '90001'
const BUILTIN_DDP_SEASON_INDEXED_ID = '269'
const BUILTIN_DDP_EPISODE_INDEXED_ID = '2690012'
const BUILTIN_DDP_IMPORTED_COMMENT_COUNT = 1
const REFRESHED_COMMENT_COUNT = 4 // ddp-comments.json's comment count.
const BUNDLED_MANIFEST_COUNT = 13

const IGNORED_ERROR_PATTERNS = [/Failed to save log/]
// An unreachable catalog is the point of the offline swap, not a
// regression: boot's syncCatalog() and the Providers page's pending-updates
// query each hit the dead index and log their own failure. Same pair
// offline-fallback.spec.ts allows.
const OFFLINE_ERROR_PATTERNS = [
  /Failed to fetch manifest catalog/,
  /Error in RPC handler/,
]

test.setTimeout(120_000)

test('prior install, swap with an unreachable catalog, built-in danmaku still fetches, self-hosted keeps its namespace, later sync reconciles cleanly', async (// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures arg
{}, testInfo) => {
  const tmpRoot = path.join(
    os.tmpdir(),
    `da-mig-offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  )
  testInfo.annotations.push({ type: 'tmpRoot', description: tmpRoot })
  await fs.mkdir(tmpRoot, { recursive: true })

  let context: BrowserContext | undefined
  try {
    context = await run(tmpRoot)
  } finally {
    await context?.close().catch(() => undefined)
    // Cleanup after context.close() so Windows file handles are released.
    await fs
      .rm(tmpRoot, { recursive: true, force: true })
      .catch(() => undefined)
  }
})

async function run(tmpRoot: string): Promise<BrowserContext> {
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

  const offline = offlineCatalog()
  await context.route(offline.pattern, offline.respond)
  const ddp = mockDandanplay({
    search: loadJsonFixture('ddp-search.json'),
    bangumi: loadJsonFixture('ddp-bangumi.json'),
    comments: loadJsonFixture('ddp-comments.json'),
  })
  await context.route(ddp.pattern, ddp.respond)
  for (const probe of mockLoginProbes()) {
    await context.route(probe.pattern, probe.respond)
  }

  const legacyPopup = await MigrationLegacyPopup.open(
    context,
    MIGRATION_EXTENSION_ID
  )
  await legacyPopup.restoreBackup(backupPath)
  await legacyPopup.importDanmaku(DANMAKU_ZIP)
  await legacyPopup.close()
  await seedSelfHostedSeason(context)

  await swapExtension(context, currentExt)

  const page = await context.newPage()
  await page.goto(
    `chrome-extension://${MIGRATION_EXTENSION_ID}/pages/popup.html`,
    { waitUntil: 'domcontentloaded', timeout: POPUP_TIMEOUT_MS }
  )
  await page.locator('#root').waitFor({ state: 'visible' })
  await dismissReleaseNotes(page)

  // The bundle seed lands after the offline index's retry-then-sleep, well
  // after the popup would otherwise mount and query an empty registry once
  // with no later refetch (see offline-fallback.spec.ts). Wait for the store
  // directly before opening the Providers page.
  await expect
    .poll(async () => Object.keys(await readManifestKinds(page)).length, {
      timeout: 15_000,
    })
    .toBeGreaterThanOrEqual(BUNDLED_MANIFEST_COUNT)

  // Built-in sources present, enabled, and resolved from the bundled
  // fallback: the catalog never answered, so nothing beyond the 13
  // build-time manifests could have registered iQIYI (never a config the
  // user owned) alongside the already-installed sources.
  let popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/providers')
  await expect(popup.providers.checkedNeverLabel()).toBeVisible()
  await expect(popup.providers.importButton(/iQIYI|爱奇艺/)).toBeVisible()

  const manifestsAfterSwap = await readManifestKinds(page)
  expect(
    Object.keys(manifestsAfterSwap).length,
    'every bundled manifest registers offline'
  ).toBeGreaterThanOrEqual(BUNDLED_MANIFEST_COUNT)
  expect(
    manifestsAfterSwap.dandanplay,
    'the built-in DanDanPlay manifest resolved from the bundle, not the dead catalog'
  ).toBe('bundled')

  // Existing seasons/episodes survive with data intact, checked by id.
  const seasons = await readSeasons(page)
  const builtinSeason = seasons.find(
    (s) =>
      s.manifestId === 'dandanplay' &&
      s.indexedId === BUILTIN_DDP_SEASON_INDEXED_ID
  )
  if (!builtinSeason) {
    throw new Error('the fixture must carry a built-in DanDanPlay season')
  }
  expect(
    builtinSeason.namespaceKey,
    'a built-in season keys to its manifestId'
  ).toBe('dandanplay')

  const episodes = await readEpisodes(page)
  const builtinEpisode = episodes.find(
    (e) =>
      e.seasonId === builtinSeason.id &&
      e.indexedId === BUILTIN_DDP_EPISODE_INDEXED_ID
  )
  if (!builtinEpisode) {
    throw new Error('the fixture must carry the imported DanDanPlay episode')
  }
  expect(
    builtinEpisode.commentCount,
    'the imported episode kept its cached comment count through the migration'
  ).toBe(BUILTIN_DDP_IMPORTED_COMMENT_COUNT)

  // Self-hosted keeps its own namespace: the highest-value assertion here,
  // since offline is the deterministic case for a namespace derived from a
  // bundled declaration instead of the dead catalog.
  const providerConfigs = await readProviderConfigs(page)
  const selfHostedConfig = providerConfigs.find(
    (c) => c.id === SELF_HOSTED_DDP_CONFIG_ID
  )
  if (!selfHostedConfig) {
    throw new Error('the fixture must carry the self-hosted DanDanPlay config')
  }
  const selfHostedSeason = seasons.find(
    (s) => s.indexedId === SELF_HOSTED_SEASON_INDEXED_ID
  )
  if (!selfHostedSeason) {
    throw new Error('the fixture must carry the seeded self-hosted season')
  }
  const selfHostedNamespace = computeNamespaceKey(selfHostedConfig, ['baseUrl'])
  expect(
    selfHostedNamespace,
    'a self-hosted config hashes to a ns: namespace, distinct from a builtin'
  ).toMatch(/^ns:/)
  expect(
    selfHostedSeason.namespaceKey,
    'the self-hosted season keeps its own namespace instead of the shared dandanplay one'
  ).toBe(selfHostedNamespace)

  // Danmaku still fetches for a built-in source: force-refresh the imported
  // episode, which bypasses the cache and re-hits the (mocked) provider API
  // through the offline-seeded bundled manifest.
  popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/mount')
  await popup.mount.waitForSeason(builtinSeason.id)
  await popup.mount.expandSeason(builtinSeason.id)
  const episodeItem = popup.mount.episodeItem(builtinEpisode.id).first()
  await expect(episodeItem).toBeVisible()
  await popup.mount.openItemMenu(episodeItem, 'refresh')

  await expect
    .poll(
      async () => {
        const rows = await readEpisodes(page)
        return rows.find((e) => e.id === builtinEpisode.id)?.commentCount
      },
      { timeout: 15_000 }
    )
    .toBe(REFRESHED_COMMENT_COUNT)
  await expect(popup.mount.episodeCommentCount(builtinEpisode.id)).toHaveText(
    String(REFRESHED_COMMENT_COUNT)
  )

  const treeItemCountBeforeSync = await page
    .locator('[role="treeitem"]')
    .count()
  const idbCountsBeforeSync = await readIdbCounts(page)
  const configIdsBeforeSync = providerConfigs.map((c) => c.id).sort()

  const errorsBeforeSync = consoleWatcher
    .getErrors()
    .filter(
      (e) =>
        ![...IGNORED_ERROR_PATTERNS, ...OFFLINE_ERROR_PATTERNS].some((p) =>
          p.test(e)
        )
    )
  expect(errorsBeforeSync, 'console errors during the offline swap').toEqual([])

  // A later reachable sync reconciles cleanly on top of the offline-upgraded
  // state: no duplicate seasons/episodes, no re-seeded provider configs, and
  // the bundle-seeded manifests auto-upgrade to the catalog copy.
  const recovered = mockCatalog()
  await context.route(recovered.pattern, recovered.respond)

  popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/providers')
  await expect(popup.providers.checkedNeverLabel()).toBeVisible()
  await popup.providers.refreshCatalog()
  await expect(popup.providers.checkedNeverLabel()).toBeHidden()

  const manifestsAfterSync = await readManifestKinds(page)
  expect(
    manifestsAfterSync.dandanplay,
    'the bundle-seeded manifest auto-upgrades to the catalog copy'
  ).toBe('preinstalled')

  const configIdsAfterSync = (await readProviderConfigs(page))
    .map((c) => c.id)
    .sort()
  expect(
    configIdsAfterSync,
    'a reachable sync re-seeds no provider configs'
  ).toEqual(configIdsBeforeSync)

  const idbCountsAfterSync = await readIdbCounts(page)
  expect(
    idbCountsAfterSync,
    'a reachable sync adds no seasons/episodes'
  ).toEqual(idbCountsBeforeSync)

  const seasonsAfterSync = await readSeasons(page)
  const selfHostedAfterSync = seasonsAfterSync.find(
    (s) => s.indexedId === SELF_HOSTED_SEASON_INDEXED_ID
  )
  expect(
    selfHostedAfterSync?.namespaceKey,
    'the self-hosted namespace stays stable across a later reachable sync'
  ).toBe(selfHostedSeason.namespaceKey)

  await Popup.open(page, MIGRATION_EXTENSION_ID, '/mount')
  const treeItemCountAfterSync = await page.locator('[role="treeitem"]').count()
  expect(
    treeItemCountAfterSync,
    'no duplicate tree rows appear after a reachable sync'
  ).toBe(treeItemCountBeforeSync)

  const errors = consoleWatcher
    .getErrors()
    .filter(
      (e) =>
        ![...IGNORED_ERROR_PATTERNS, ...OFFLINE_ERROR_PATTERNS].some((p) =>
          p.test(e)
        )
    )
  expect(
    errors,
    'console errors during the offline swap and later sync'
  ).toEqual([])

  return context
}

async function gunzipTo(src: string, dest: string): Promise<string> {
  await pipeline(createReadStream(src), createGunzip(), createWriteStream(dest))
  return dest
}

// Both popups fetch the GitHub releases API on open via useLatestReleaseNotes;
// on CI that unauthenticated call hits a rate limit (403) that trips the
// console watcher. Stub just that one route.
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

// The current build's popup shows a What's New dialog on its first open
// after a version bump, gated on the same stubbed GitHub release fetch as
// the legacy popup. It stays dismissed for the rest of the profile's life.
async function dismissReleaseNotes(page: Page): Promise<void> {
  const okButton = page.getByRole('button', { name: /^(Ok|知道了)$/ })
  try {
    await okButton.waitFor({ state: 'visible', timeout: 3_000 })
    await okButton.click()
  } catch {
    // Nothing to dismiss.
  }
}

// v1.5.0's danmaku import rewrites every imported season's providerConfigId
// to the builtin for its provider tag, so no UI route can produce a season
// owned by a self-hosted server. Write the v14 row directly instead; the swap
// still runs the real v15 migration and the real runtime reconciler over it.
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

interface SeasonRow {
  id: number
  indexedId?: string
  manifestId?: string
  namespaceKey?: string
}

async function readSeasons(page: Page): Promise<SeasonRow[]> {
  return page.evaluate(
    (dbName) =>
      new Promise<SeasonRow[]>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          try {
            const tx = db.transaction(['season'], 'readonly')
            const getAll = tx.objectStore('season').getAll()
            tx.oncomplete = () => {
              db.close()
              resolve(getAll.result as SeasonRow[])
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

interface EpisodeRow {
  id: number
  indexedId?: string
  seasonId?: number
  commentCount?: number
}

async function readEpisodes(page: Page): Promise<EpisodeRow[]> {
  return page.evaluate(
    (dbName) =>
      new Promise<EpisodeRow[]>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          try {
            const tx = db.transaction(['episode'], 'readonly')
            const getAll = tx.objectStore('episode').getAll()
            tx.oncomplete = () => {
              db.close()
              resolve(getAll.result as EpisodeRow[])
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

// ExtStorageService wraps stored values under their own key, so the value at
// chrome.storage.local['manifests'] is the ManifestRecord itself.
async function readManifestKinds(page: Page): Promise<Record<string, string>> {
  return page.evaluate(async () => {
    const stored = (await chrome.storage.local.get('manifests')).manifests as
      | Record<string, { kind: string }>
      | undefined
    const out: Record<string, string> = {}
    for (const [id, entry] of Object.entries(stored ?? {})) {
      out[id] = entry.kind
    }
    return out
  })
}
