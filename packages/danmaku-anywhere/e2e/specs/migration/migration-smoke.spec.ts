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
import { DANMAKU_DB_NAME } from '../../../src/common/db/db'
import migrationConfig from '../../migration.config.json' with { type: 'json' }
import { mockCatalog } from '../../network/catalog'
import { ImportPage } from '../../pom/ImportPage'
import { Popup } from '../../pom/Popup'
import { MigrationLegacyPopup } from '../../poms/legacy/v1.5.0/MigrationLegacyPopup'
import { assertBuiltinNamesLocalized } from '../../setup/builtinNames'
import { attachConsoleWatcher } from '../../setup/console-watcher'
import { MIGRATION_EXTENSION_ID } from '../../setup/extensionKey'
import {
  dismissReleaseNotes,
  type OptionsSnapshot,
  readIdbRows,
  readOptionsSnapshot,
  schemaViolations,
} from '../../setup/migrationState'
import { upgradeToCurrentBuild } from '../../setup/priorInstall'
import {
  ensureCurrentBuildForMigration,
  ensurePriorRelease,
} from '../../setup/priorRelease'
import { launchExtension } from '../../setup/swapExtension'

/**
 * Seeds real user state through v1.5.0's own popup (backup restore, danmaku
 * import, title mappings), swaps to the current build, and asserts the upgrade
 * ran without errors and kept the data: every options store parses against its
 * current schema and keeps the user's values, sources keep their order and
 * enabled flags, every season is keyed by a bare provider config id with a
 * manifestId (the self-hosted one keeps its uuid), and title mappings follow
 * the prefix strip.
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

// Mirrors the checked-in backup fixture: the self-hosted DanDanPlay server whose
// id the upgrade must keep on the season it owns.
const SELF_HOSTED_DDP_BASE_URL = 'https://ddp.selfhosted.example'
const SELF_HOSTED_DDP_CONFIG_ID = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'
const SELF_HOSTED_SEASON_INDEXED_ID = '90001'
// The danmaku zip carries one episode exported from the self-hosted server.
// v1.5.0's import files it under the built-in; a current import keeps its uuid.
const SELF_HOSTED_ZIP_SEASON_INDEXED_ID = '17998'
const BUILTIN_MANIFEST_IDS = ['dandanplay', 'bilibili', 'tencent']
const PUBLIC_COMPAT_DDP_BASE_URL = 'https://danmu.selfhosted.example'
const MACCMS_CONFIG_ID = '21999133-1b22-4e15-a48b-a8c6677cd902'
const PUBLIC_COMPAT_DDP_CONFIG_ID = 'e15d5979-e823-4ce8-a2ab-513dc358dae1'
const OPENAI_PROVIDER_ID = '644241b5-68bb-43b4-8f63-4ecc860373a5'
const OLLAMA_PROVIDER_ID = '7092c0a2-1651-4766-adef-a667f5d51710'
const INTEGRATION_ID = '67d4ae50-a697-41b0-925c-40937a2fa19a'
const BUILTIN_TITLE_MAPPING = 'Mapped Builtin Show'
const SELF_HOSTED_TITLE_MAPPING = 'Mapped Self Hosted Show'

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
  const mappedSeasons = await findMappedSeasons(seededProbe)
  await seededProbe.close()
  await seedTitleMappings(context, mappedSeasons)
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

  await upgradeToCurrentBuild(context, currentExt)

  const probe = await openProbePage(context)
  const postSync = await readSyncSnapshot(probe)
  const postIdb = await readIdbCounts(probe)
  const postSeasonIdentity = await readSeasonIdentities(probe)
  const postCustomDdpConfigs = await readCustomDdpConfigs(probe)
  const postMacCmsConfig = await readMacCmsConfig(probe)
  const postOptions = await readOptionsSnapshot(probe)
  const postSchemaViolations = await schemaViolations(probe, postOptions)
  const postManifest = await probe.evaluate(
    () => chrome.runtime.getManifest().version
  )
  await probe.close()

  const errors = consoleWatcher
    .getErrors()
    .filter((e) => !IGNORED_ERROR_PATTERNS.some((p) => p.test(e)))
  expect(errors, 'console errors during migration swap').toEqual([])
  expect(postManifest).not.toBe(
    migrationConfig.baselinePriorTag.replace(/^v/, '')
  )
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
  expect(postIdb, 'season and episode counts preserved').toEqual(seededIdb)
  assertCustomDdpConfigs(postCustomDdpConfigs)
  assertMacCmsConfig(postMacCmsConfig)
  expect(postSeasonIdentity.length, 'every seeded season survived').toBe(
    seededIdb.seasons
  )
  assertSeasonIdentities(postSeasonIdentity)
  expect(
    postSeasonIdentity
      .filter((row) => row.providerConfigId === SELF_HOSTED_DDP_CONFIG_ID)
      .map((row) => row.indexedId),
    'the self-hosted season kept its uuid'
  ).toEqual([SELF_HOSTED_SEASON_INDEXED_ID])

  expect
    .soft(
      postSchemaViolations,
      'every options store parses against its current schema'
    )
    .toEqual({})
  assertUserOptions(postOptions)
  assertProviderOrder(postOptions)
  await assertTitleMappings(context, mappedSeasons)
  await assertUpgradedUi(context)

  await assertPostMigrationReimport(context)
  await assertBuiltinNamesLocalized(context, MIGRATION_EXTENSION_ID, {
    seasonChips: true,
  })

  return context
}

// Every season is keyed by a bare config id: a built-in's id is its manifest
// id, and only the fixture's self-hosted server owns a uuid-keyed season.
function assertSeasonIdentities(rows: SeasonIdentityRow[]): void {
  for (const row of rows) {
    expect(row.hasProvider, `season ${row.id} dropped its provider field`).toBe(
      false
    )
    expect(
      row.hasNamespaceKey,
      `season ${row.id} carries no namespaceKey`
    ).toBe(false)
    expect(
      BUILTIN_MANIFEST_IDS,
      `season ${row.id} has a built-in manifestId`
    ).toContain(row.manifestId)
    if (row.providerConfigId === SELF_HOSTED_DDP_CONFIG_ID) {
      expect(
        row.manifestId,
        `self-hosted season ${row.id} is a dandanplay season`
      ).toBe('dandanplay')
      continue
    }
    expect(
      row.providerConfigId,
      `season ${row.id} is keyed by its built-in config id`
    ).toBe(row.manifestId)
  }
}

// Re-importing the original danmaku zip into the upgraded DB: built-in entries
// dedup onto the migrated rows, and the entry exported from the self-hosted
// server lands under that server's config instead of the built-in.
async function assertPostMigrationReimport(
  context: BrowserContext
): Promise<void> {
  const page = await context.newPage()
  const importPage = await ImportPage.open(page, MIGRATION_EXTENSION_ID)
  const before = await readSeasonIdentities(page)

  await importPage.selectFiles(DANMAKU_ZIP)
  await importPage.result.confirm()
  await importPage.result.expectSuccess()

  const after = await readSeasonIdentities(page)
  await page.close()

  assertSeasonIdentities(after)
  const beforeIds = new Set(before.map((row) => row.id))
  const added = after.filter((row) => !beforeIds.has(row.id))
  expect(
    added.map((row) => [row.providerConfigId, row.indexedId]),
    'only the self-hosted entry adds a season, under its own config'
  ).toEqual([[SELF_HOSTED_DDP_CONFIG_ID, SELF_HOSTED_ZIP_SEASON_INDEXED_ID]])
  expect(
    after
      .filter((row) => row.providerConfigId === SELF_HOSTED_DDP_CONFIG_ID)
      .map((row) => row.indexedId)
      .sort(),
    'the migrated self-hosted season kept its uuid through the re-import'
  ).toEqual(
    [SELF_HOSTED_SEASON_INDEXED_ID, SELF_HOSTED_ZIP_SEASON_INDEXED_ID].sort()
  )
}

// Values the fixture generator set through v1.5.0, so they differ from every
// default and a migration that resets a store shows up here.
function assertUserOptions(snapshot: OptionsSnapshot): void {
  expect
    .soft(
      snapshot.extensionOptions?.data,
      'extensionOptions kept what the user set in v1.5.0'
    )
    .toMatchObject({
      id: '00000000-0000-0000-0000-000000000001',
      lang: 'en',
      searchUsingSimplified: true,
      theme: { colorMode: 'dark' },
      retentionPolicy: { enabled: true, deleteCommentsAfter: 14 },
      playerOptions: {
        showSkipButton: false,
        showDanmakuTimeline: true,
        enableFullscreenInteraction: true,
      },
      hotkeys: {
        refreshComments: { key: 'alt+r', enabled: true },
        togglePip: { key: 'shift+p', enabled: false },
        toggleEnableDanmaku: { key: 'shift+b', enabled: true },
        unmountComments: { key: 'shift+u', enabled: true },
        openSearchPanel: expect.objectContaining({ enabled: true }),
      },
      showFloatingButton: true,
      autoBookmark: false,
      infoPanel: {},
    })
  expect
    .soft(
      snapshot.extensionOptions?.data,
      'the info panel is left to the build default, not switched on or off'
    )
    .not.toHaveProperty('infoPanel.enabled')

  expect
    .soft(
      snapshot.danmakuOptions?.data,
      'danmakuOptions kept what the user set in v1.5.0'
    )
    .toMatchObject({
      speed: 1.5,
      useCustomCss: true,
      customCss: '.da-danmaku {\n  font-weight: 800;\n}',
      filters: [
        { type: 'text', value: '剧透', enabled: true },
        { type: 'regex', value: '^前方高能', enabled: false },
      ],
      area: { xStart: 10, xEnd: 90, yStart: 5, yEnd: 60 },
      style: { fontSize: 30 },
      collapse: expect.objectContaining({ dedupe: expect.anything() }),
      occlusion: false,
    })
  expect
    .soft(
      snapshot.danmakuOptions?.data,
      'the dedup field step 8 adds is dropped again by step 9'
    )
    .not.toHaveProperty('dedup')

  expect
    .soft(snapshot.mountConfig?.data, 'both mount configs kept their fields')
    .toEqual([
      expect.objectContaining({
        id: '081cea50-9433-4e51-b219-9e0a1fcad3b2',
        name: 'Danmaku Somewhere',
        enabled: true,
        patterns: ['https://danmaku.weeblify.app/*'],
        mediaQuery: 'video',
        mode: 'xpath',
        integration: INTEGRATION_ID,
        ai: { providerId: 'built-in' },
      }),
      expect.objectContaining({
        id: '89eb0cef-b290-450e-833c-ecf86734467d',
        name: 'Jellyfin',
        enabled: false,
        patterns: ['https://jellyfin.selfhosted.example/*'],
        mediaQuery: 'video',
        mode: 'ai',
        ai: { providerId: OPENAI_PROVIDER_ID },
      }),
    ])

  expect
    .soft(
      snapshot.integrationPolicy?.data,
      'the integration policy kept its selectors'
    )
    .toEqual([
      expect.objectContaining({
        id: INTEGRATION_ID,
        name: 'danmaku-somewhere',
        policy: expect.objectContaining({
          title: {
            selector: [{ value: '//*[@id="media-title"]', quick: false }],
            regex: [],
          },
          episode: {
            selector: [{ value: '//*[@id="episode"]', quick: false }],
            regex: [{ value: '第(\\d+)集', quick: false }],
          },
        }),
      }),
    ])

  expect
    .soft(
      snapshot.aiProviderConfig?.data,
      'AI providers kept their endpoint and model'
    )
    .toEqual([
      expect.objectContaining({ id: 'built-in', enabled: true }),
      expect.objectContaining({
        id: OPENAI_PROVIDER_ID,
        name: 'openai',
        enabled: true,
        settings: expect.objectContaining({
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-5-nano',
          apiKey: 'REDACTED_API_KEY',
        }),
      }),
      expect.objectContaining({
        id: OLLAMA_PROVIDER_ID,
        name: 'ollama',
        enabled: false,
        settings: expect.objectContaining({
          baseUrl: 'http://localhost:11434/v1',
          model: 'deepseek-r1:7b',
        }),
      }),
    ])
}

// The fixture moves the built-ins out of their seeded order and disables
// Tencent through v1.5.0's providers page. v1.5.0 could not rename a built-in
// (its schema pins the name), so only the custom names are user-chosen.
function assertProviderOrder(snapshot: OptionsSnapshot): void {
  const configs = (snapshot.providerConfig?.data ?? []) as Array<{
    id: string
    name: string
    enabled: boolean
  }>
  expect
    .soft(
      configs.map((config) => [config.id, config.enabled]),
      'sources keep the order and enabled flags the user left in v1.5.0'
    )
    .toEqual([
      [SELF_HOSTED_DDP_CONFIG_ID, true],
      ['bilibili', true],
      ['dandanplay', true],
      [MACCMS_CONFIG_ID, true],
      ['tencent', false],
      [PUBLIC_COMPAT_DDP_CONFIG_ID, true],
    ])
  const customNames = configs
    .filter((config) => {
      return !['bilibili', 'dandanplay', 'tencent'].includes(config.id)
    })
    .map((config) => config.name)
  expect
    .soft(customNames, 'custom sources keep their names')
    .toEqual(['DanDanPlay', 'VOD', 'Danmu API'])
}

interface MappedSeasons {
  dandanplay: number
  bilibili: number
  selfHosted: number
}

async function findMappedSeasons(page: Page): Promise<MappedSeasons> {
  const rows = await readIdbRows<{
    id: number
    indexedId: string
    providerConfigId?: string
  }>(page, 'season')
  const dandanplay = rows.find((row) => {
    return row.providerConfigId === 'builtin:dandanplay'
  })
  const bilibili = rows.find((row) => {
    return row.providerConfigId === 'builtin:bilibili'
  })
  const selfHosted = rows.find((row) => {
    return row.indexedId === SELF_HOSTED_SEASON_INDEXED_ID
  })
  if (!dandanplay || !bilibili || !selfHosted) {
    throw new Error(
      'the fixture must carry DanDanPlay, Bilibili and self-hosted seasons'
    )
  }
  return {
    dandanplay: dandanplay.id,
    bilibili: bilibili.id,
    selfHosted: selfHosted.id,
  }
}

// v1.5.0 keys a title mapping by provider config id: `builtin:*` for the
// built-ins, the config's own id for a custom server.
async function seedTitleMappings(
  context: BrowserContext,
  seasons: MappedSeasons
): Promise<void> {
  const legacy = await MigrationLegacyPopup.open(
    context,
    MIGRATION_EXTENSION_ID
  )
  await legacy.addTitleMapping({
    key: BUILTIN_TITLE_MAPPING,
    seasons: {
      'builtin:dandanplay': seasons.dandanplay,
      'builtin:bilibili': seasons.bilibili,
    },
    seasonIds: [seasons.dandanplay, seasons.bilibili],
  })
  await legacy.addTitleMapping({
    key: SELF_HOSTED_TITLE_MAPPING,
    seasons: { [SELF_HOSTED_DDP_CONFIG_ID]: seasons.selfHosted },
    seasonIds: [seasons.selfHosted],
  })
  await legacy.close()
}

interface SeasonMapRow {
  key: string
  seasons: Record<string, number>
  seasonIds: number[]
}

// v14 strips the builtin prefix; a custom config id is already bare.
async function assertTitleMappings(
  context: BrowserContext,
  seasons: MappedSeasons
): Promise<void> {
  const page = await context.newPage()
  await Popup.open(page, MIGRATION_EXTENSION_ID, '/title-mapping')
  await expect(
    page.getByText(BUILTIN_TITLE_MAPPING, { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText(SELF_HOSTED_TITLE_MAPPING, { exact: true })
  ).toBeVisible()

  const rows = await readIdbRows<SeasonMapRow>(page, 'seasonMap')
  expect(
    rows
      .map((row) => ({
        key: row.key,
        seasons: row.seasons,
        seasonIds: [...row.seasonIds].sort((a, b) => a - b),
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    'title mappings keep their seasons under bare config ids'
  ).toEqual([
    {
      key: BUILTIN_TITLE_MAPPING,
      seasons: {
        dandanplay: seasons.dandanplay,
        bilibili: seasons.bilibili,
      },
      seasonIds: [seasons.dandanplay, seasons.bilibili].sort((a, b) => {
        return a - b
      }),
    },
    {
      key: SELF_HOSTED_TITLE_MAPPING,
      seasons: { [SELF_HOSTED_DDP_CONFIG_ID]: seasons.selfHosted },
      seasonIds: [seasons.selfHosted],
    },
  ])
  await page.close()
}

async function assertUpgradedUi(context: BrowserContext): Promise<void> {
  const page = await context.newPage()
  let popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/providers')
  await dismissReleaseNotes(page)
  // The user picked English in v1.5.0, so this heading is not locale-agnostic
  // on purpose. The three DanDanPlay servers render as one group.
  await expect(page.getByText('Installed (4)', { exact: true })).toBeVisible()
  await expect(popup.providers.switches({ checked: false })).toHaveCount(1)
  await expect(popup.providers.enabledSwitch('VOD')).toBeChecked()

  popup = await Popup.open(page, MIGRATION_EXTENSION_ID, '/config')
  await popup.config.expectRow('Danmaku Somewhere')
  await popup.config.expectRow('Jellyfin')

  await Popup.open(page, MIGRATION_EXTENSION_ID, '/ai-providers')
  await expect(page.getByText('openai', { exact: true })).toBeVisible()
  await expect(page.getByText('ollama', { exact: true })).toBeVisible()
  await page.close()
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
  providerConfigId?: string
  hasProvider: boolean
  hasNamespaceKey: boolean
}

async function readSeasonIdentities(page: Page): Promise<SeasonIdentityRow[]> {
  const rows = await readIdbRows<{
    id: number
    indexedId?: string
    manifestId?: string
    providerConfigId?: string
    provider?: unknown
    namespaceKey?: unknown
  }>(page, 'season')
  return rows.map((row) => ({
    id: row.id,
    indexedId: row.indexedId,
    manifestId: row.manifestId,
    providerConfigId: row.providerConfigId,
    hasProvider: 'provider' in row,
    hasNamespaceKey: 'namespaceKey' in row,
  }))
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
// by a self-hosted server. Write the v12 row directly instead; the swap still
// runs the real upgrade over it.
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
