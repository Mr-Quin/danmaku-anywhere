import {
  DanmakuSourceType,
  type EpisodeMeta,
  LEGACY_MACCMS_ID,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { ManifestRunner } from '@mr-quin/dango'
import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { BookmarkService } from '@/background/services/persistence/BookmarkService'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { LoggerSymbol } from '@/common/Logger'
import { Language } from '@/common/localization/language'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { computeNamespaceKey } from '@/common/providers/namespaceKey'
import {
  createTestContainer,
  type TestContainerOverride,
} from '@/tests/createTestContainer'
import { makeSeason, makeSeasonInsert } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import type { IDanmakuProvider } from './IDanmakuProvider'
import { MANIFEST_RUN_OPTIONS } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'
import { DanmakuProviderFactory } from './ProviderFactory'
import { ProviderService } from './ProviderService'

/**
 * ProviderService keys legacy custom-danmaku behavior off the config's
 * manifestId (LEGACY_MACCMS_ID), not the season/episode `provider` tag. This
 * lets a generic catalog source (any registered manifest) search, fetch
 * episodes, and fetch danmaku without tripping the MacCMS-only guards, while
 * MacCMS keeps its bespoke restrictions.
 */

type ExtensionOptions = Awaited<ReturnType<ExtensionOptionsService['get']>>

function makeExtensionOptionsGet(lang: Language = Language.zh) {
  return async function get(): Promise<Pick<ExtensionOptions, 'lang'>> {
    return { lang }
  }
}

const silentExtensionOptions = { get: makeExtensionOptionsGet() }

function makeConfig(manifestId: string): ProviderConfig {
  return {
    id: `${manifestId}-1`,
    manifestId,
    name: manifestId,
    enabled: true,
    configValues: {},
  }
}

function makeProvider(
  overrides: Partial<
    Pick<IDanmakuProvider, 'search' | 'getEpisodes' | 'getDanmaku'>
  > = {}
): Pick<IDanmakuProvider, 'search' | 'getEpisodes' | 'getDanmaku'> {
  return {
    search: vi.fn(async () => []),
    getEpisodes: vi.fn(async () => []),
    getDanmaku: vi.fn(async () => []),
    ...overrides,
  }
}

interface ServiceDoubles {
  danmakuService?: unknown
  seasonService?: unknown
  providerConfigService?: unknown
  factory?: unknown
  registry?: unknown
  bookmarkService?: unknown
  logger?: unknown
  extensionOptions?: unknown
}

// Every ProviderService test builds the service through a real container so
// each collaborator double is typed against the class it stands in for
// instead of blanket-casting the whole constructor argument list. A test
// only overrides the collaborators its scenario actually touches.
function buildService(doubles: ServiceDoubles = {}) {
  const overrides: TestContainerOverride<unknown>[] = [
    { identifier: DanmakuService, value: doubles.danmakuService ?? {} },
    { identifier: SeasonService, value: doubles.seasonService ?? {} },
    {
      identifier: ProviderConfigService,
      value: doubles.providerConfigService ?? {},
    },
    { identifier: DanmakuProviderFactory, value: doubles.factory ?? vi.fn() },
    {
      identifier: ManifestRegistry,
      value: doubles.registry ?? { ready: Promise.resolve() },
    },
    { identifier: BookmarkService, value: doubles.bookmarkService ?? {} },
    { identifier: LoggerSymbol, value: doubles.logger ?? silentLogger },
    {
      identifier: ExtensionOptionsService,
      value: doubles.extensionOptions ?? silentExtensionOptions,
    },
  ]
  return createTestContainer([backgroundContainerModule], overrides).get(
    ProviderService
  )
}

function build(
  config: ProviderConfig,
  provider: Pick<IDanmakuProvider, 'search' | 'getEpisodes' | 'getDanmaku'>,
  opts: {
    findExisting?: unknown
    existingDanmaku?: unknown[]
    configMissing?: boolean
  } = {}
) {
  const filter = vi.fn(async () => opts.existingDanmaku ?? [])
  // upsert<T extends EpisodeInsert> is generic; a double can't satisfy that
  // signature without an unsafe cast, so it stays untyped here.
  const upsert = vi.fn(async (e: unknown) => e)
  const danmakuService = { filter, upsert }

  const season = makeSeason({
    manifestId: config.manifestId,
    namespaceKey: computeNamespaceKey(config, []),
    providerIds: { animeId: 42 },
    title: 'Show',
  })

  const mustGetById = vi.fn<SeasonService['mustGetById']>(async () => season)
  // findExisting<T extends SeasonInsert> is generic; same as upsert above.
  const findExisting = vi.fn(async () => opts.findExisting)
  const seasonService = { mustGetById, findExisting }

  const mustGet = vi.fn<ProviderConfigService['mustGet']>(async () => config)
  const get = vi.fn<ProviderConfigService['get']>(async () =>
    opts.configMissing ? undefined : config
  )
  const getAll = vi.fn<ProviderConfigService['getAll']>(async () =>
    opts.configMissing ? [] : [config]
  )
  const providerConfigService = { mustGet, get, getAll }

  const factory = vi.fn(() => provider)

  const getIdentityFieldsMap = vi.fn<ManifestRegistry['getIdentityFieldsMap']>(
    async () => ({})
  )
  const registry = { ready: Promise.resolve(), getIdentityFieldsMap }

  const service = buildService({
    danmakuService,
    seasonService,
    providerConfigService,
    factory,
    registry,
  })

  return { service, provider, danmakuService, seasonService }
}

describe('ProviderService.probeLogin', () => {
  it('runs the login probe with the private-host opt-in', async () => {
    const runLoginProbe = vi.fn(async () => true)
    // runLoginProbe<T = unknown> is generic, so a vi.fn double can't satisfy
    // ManifestRunner's real signature without an unsafe cast.
    const getRunner = vi.fn<ManifestRegistry['getRunner']>(
      () => ({ runLoginProbe }) as unknown as ManifestRunner // lint-specs-allow-cast: generic method signature, see comment above
    )
    const service = buildService({
      factory: vi.fn(() => makeProvider()),
      registry: { ready: Promise.resolve(), getRunner },
    })

    await service.probeLogin('dandanplay')

    expect(runLoginProbe).toHaveBeenCalledWith(undefined, MANIFEST_RUN_OPTIONS)
  })
})

describe('ProviderService.getManifestSpec', () => {
  function buildWithManifest(manifest: Record<string, unknown>) {
    const getRunner = vi.fn<ManifestRegistry['getRunner']>(
      () => ({ manifest }) as ManifestRunner
    )
    return buildService({
      factory: vi.fn(() => makeProvider()),
      registry: { ready: Promise.resolve(), getRunner },
    })
  }

  it('resolves name, configSchema, and cookieSet title into the locale', async () => {
    const service = buildWithManifest({
      id: 'dandanplay',
      name: 'DanDanPlay',
      cookieSet: { url: 'https://ddp.example/login', title: 'Sign in' },
      configSchema: {
        type: 'object',
        properties: { baseUrl: { type: 'string', title: 'Base URL' } },
      },
      locales: {
        'zh-CN': {
          name: '弹弹play',
          'cookieSet.title': '登录',
          'configSchema.properties.baseUrl.title': '基础地址',
        },
      },
    })

    const spec = await service.getManifestSpec('dandanplay', 'zh-CN')

    expect(spec.name).toBe('弹弹play')
    expect(spec.cookieSet).toEqual({
      url: 'https://ddp.example/login',
      title: '登录',
    })
    expect(spec.configSchema?.properties?.baseUrl.title).toBe('基础地址')
  })

  it('falls back to source strings when no locale is given', async () => {
    const service = buildWithManifest({
      id: 'dandanplay',
      name: 'DanDanPlay',
      locales: { 'zh-CN': { name: '弹弹play' } },
    })

    const spec = await service.getManifestSpec('dandanplay')

    expect(spec.name).toBe('DanDanPlay')
  })

  it('rejects when no manifest is registered for the id', async () => {
    const getRunner = vi.fn<ManifestRegistry['getRunner']>(() => {
      throw new Error('no manifest registered with id: missing')
    })
    const service = buildService({
      factory: vi.fn(() => makeProvider()),
      registry: { ready: Promise.resolve(), getRunner },
    })

    await expect(service.getManifestSpec('missing')).rejects.toThrow()
  })
})

describe('ProviderService legacy-maccms decoupling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchEpisodesBySeason', () => {
    it('fetches episodes for a generic catalog source without throwing', async () => {
      const provider = makeProvider({
        getEpisodes: vi.fn(async () => []),
      })
      const { service } = build(makeConfig('iqiyi'), provider)

      await expect(service.fetchEpisodesBySeason(1)).resolves.toEqual([])
      expect(provider.getEpisodes).toHaveBeenCalledWith({ animeId: 42 })
    })

    it('throws for a legacy MacCMS config', async () => {
      const provider = makeProvider()
      const { service } = build(makeConfig(LEGACY_MACCMS_ID), provider)

      await expect(service.fetchEpisodesBySeason(1)).rejects.toThrow(
        'MacCMS does not support fetching episodes'
      )
      expect(provider.getEpisodes).not.toHaveBeenCalled()
    })

    it('throws a source-removed error when the season is orphaned', async () => {
      const provider = makeProvider()
      const { service } = build(makeConfig('iqiyi'), provider, {
        configMissing: true,
      })

      await expect(service.fetchEpisodesBySeason(1)).rejects.toThrow(
        'This source has been removed'
      )
      expect(provider.getEpisodes).not.toHaveBeenCalled()
    })
  })

  describe('searchSeason', () => {
    it('resolves a generic source result against existing seasons (not a custom-season cast)', async () => {
      const insert = {
        ...makeSeasonInsert({ indexedId: 'x', title: 'A' }),
        provider: DanmakuSourceType.DanDanPlay,
      }
      const existing = { ...insert, id: 99 }
      const provider = makeProvider({
        search: vi.fn<IDanmakuProvider['search']>(async () => [insert]),
      })
      const { service, seasonService } = build(makeConfig('iqiyi'), provider, {
        findExisting: existing,
      })

      const result = await service.searchSeason({
        providerConfigId: 'iqiyi-1',
        keyword: 'a',
      })

      // The generic branch swaps the insert for its persisted row; the MacCMS
      // branch would return the insert verbatim, never calling findExisting.
      expect(result).toEqual([existing])
      expect(seasonService.findExisting).toHaveBeenCalledWith(insert)
    })

    it('returns MacCMS results verbatim as custom seasons without resolving existing', async () => {
      const customSeason = {
        ...makeSeasonInsert({ indexedId: 'c', title: 'C' }),
        provider: DanmakuSourceType.MacCMS,
      }
      const provider = makeProvider({
        search: vi.fn<IDanmakuProvider['search']>(async () => [customSeason]),
      })
      const { service, seasonService } = build(
        makeConfig(LEGACY_MACCMS_ID),
        provider,
        { findExisting: { ...customSeason, id: 7 } }
      )

      const result = await service.searchSeason({
        providerConfigId: `${LEGACY_MACCMS_ID}-1`,
        keyword: 'c',
      })

      expect(result).toEqual([customSeason])
      expect(seasonService.findExisting).not.toHaveBeenCalled()
    })
  })

  describe('getDanmaku', () => {
    const iqiyiConfig = makeConfig('iqiyi')
    const meta = {
      indexedId: 'ep1',
      seasonId: 1,
      providerIds: {},
      season: {
        id: 1,
        manifestId: iqiyiConfig.manifestId,
        namespaceKey: computeNamespaceKey(iqiyiConfig, []),
      },
    } as WithSeason<EpisodeMeta>

    it('fetches danmaku for a generic source', async () => {
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service } = build(iqiyiConfig, provider)

      await service.getDanmaku({ type: 'by-meta', meta, options: {} })

      expect(provider.getDanmaku).toHaveBeenCalled()
    })

    it('serves cached danmaku without fetching or resolving the config', async () => {
      const cached = { id: 5, comments: [] }
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service } = build(iqiyiConfig, provider, {
        existingDanmaku: [cached],
      })

      const result = await service.getDanmaku({
        type: 'by-meta',
        meta,
        options: {},
      })

      expect(result).toEqual(cached)
      expect(provider.getDanmaku).not.toHaveBeenCalled()
    })

    it('throws for a legacy MacCMS config', async () => {
      const provider = makeProvider()
      const maccmsConfig = makeConfig(LEGACY_MACCMS_ID)
      const maccmsMeta = {
        ...meta,
        season: {
          id: 1,
          manifestId: maccmsConfig.manifestId,
          namespaceKey: computeNamespaceKey(maccmsConfig, []),
        },
      } as WithSeason<EpisodeMeta>
      const { service } = build(maccmsConfig, provider)

      await expect(
        service.getDanmaku({ type: 'by-meta', meta: maccmsMeta, options: {} })
      ).rejects.toThrow('MacCMS episodes are not refetchable')
      expect(provider.getDanmaku).not.toHaveBeenCalled()
    })

    it('throws a source-removed error when forcing an orphaned season', async () => {
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service } = build(iqiyiConfig, provider, {
        configMissing: true,
      })

      await expect(
        service.getDanmaku({
          type: 'by-meta',
          meta,
          options: { forceUpdate: true },
        })
      ).rejects.toThrow('This source has been removed')
      expect(provider.getDanmaku).not.toHaveBeenCalled()
    })
  })
})

describe('ProviderService.refreshCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function buildForRefresh(opts: {
    pending: { manifestId: string; fromVersion: string; toVersion: string }[]
    installedManifestIds: string[]
  }) {
    const applyUpdates = vi.fn<ManifestRegistry['applyUpdates']>(async () => {})
    const recordChecked = vi.fn<ManifestRegistry['recordChecked']>(
      async () => {}
    )
    const getPendingUpdates = vi.fn<ManifestRegistry['getPendingUpdates']>(
      async () => opts.pending
    )
    const update = vi.fn<ManifestRegistry['update']>(async () => 'synced')
    const listManifests = vi.fn<ManifestRegistry['listManifests']>(() => [])
    const getLastCheckedAt = vi.fn<ManifestRegistry['getLastCheckedAt']>(
      async () => 0
    )
    const registry = {
      ready: Promise.resolve(),
      update,
      getPendingUpdates,
      applyUpdates,
      recordChecked,
      listManifests,
      getLastCheckedAt,
    }

    const getAll = vi.fn<ProviderConfigService['getAll']>(async () =>
      opts.installedManifestIds.map((manifestId) => makeConfig(manifestId))
    )
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => true
    )
    const providerConfigService = { getAll, hasSeeded }

    const service = buildService({ providerConfigService, registry })

    return { service, applyUpdates, recordChecked, getPendingUpdates }
  }

  it('auto-applies updates for uninstalled manifests only', async () => {
    const { service, applyUpdates } = buildForRefresh({
      pending: [
        { manifestId: 'bilibili', fromVersion: '1.0.0', toVersion: '2.0.0' },
        { manifestId: 'iqiyi', fromVersion: '1.0.0', toVersion: '2.0.0' },
      ],
      installedManifestIds: ['bilibili'],
    })

    await service.refreshCatalog()

    expect(applyUpdates).toHaveBeenCalledWith(['iqiyi'])
  })

  it('does not apply anything when every pending update is installed', async () => {
    const { service, applyUpdates } = buildForRefresh({
      pending: [
        { manifestId: 'bilibili', fromVersion: '1.0.0', toVersion: '2.0.0' },
      ],
      installedManifestIds: ['bilibili'],
    })

    await service.refreshCatalog()

    expect(applyUpdates).not.toHaveBeenCalled()
  })

  it('still records the check when pending detection fails mid-sync', async () => {
    const { service, applyUpdates, recordChecked, getPendingUpdates } =
      buildForRefresh({
        pending: [],
        installedManifestIds: [],
      })
    getPendingUpdates.mockRejectedValueOnce(new Error('index died mid-sync'))

    await service.refreshCatalog()

    expect(applyUpdates).not.toHaveBeenCalled()
    expect(recordChecked).toHaveBeenCalledTimes(1)
  })

  it('stamps lastCheckedAt after bringing the catalog current', async () => {
    const { service, recordChecked } = buildForRefresh({
      pending: [],
      installedManifestIds: [],
    })

    await service.refreshCatalog()

    expect(recordChecked).toHaveBeenCalledTimes(1)
  })

  it('throws and does not record a check when the catalog index fetch fails', async () => {
    const recordChecked = vi.fn<ManifestRegistry['recordChecked']>(
      async () => {}
    )
    const getPendingUpdates = vi.fn<ManifestRegistry['getPendingUpdates']>(
      async () => []
    )
    const update = vi.fn<ManifestRegistry['update']>(async () => 'unreachable')
    const listManifests = vi.fn<ManifestRegistry['listManifests']>(() => [])
    const getLastCheckedAt = vi.fn<ManifestRegistry['getLastCheckedAt']>(
      async () => 0
    )
    const registry = {
      ready: Promise.resolve(),
      update,
      getPendingUpdates,
      applyUpdates: vi.fn(async () => {}),
      recordChecked,
      listManifests,
      getLastCheckedAt,
    }
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => true
    )
    const service = buildService({
      providerConfigService: { hasSeeded },
      registry,
    })

    await expect(service.refreshCatalog()).rejects.toThrow(
      /Failed to fetch the manifest catalog/
    )

    expect(getPendingUpdates).not.toHaveBeenCalled()
    expect(recordChecked).not.toHaveBeenCalled()
  })

  it('throws a fetch-free error when the catalog answers with nothing usable', async () => {
    const update = vi.fn<ManifestRegistry['update']>(async () => 'empty')
    const getPendingUpdates = vi.fn<ManifestRegistry['getPendingUpdates']>(
      async () => []
    )
    const listManifests = vi.fn<ManifestRegistry['listManifests']>(() => [])
    const getLastCheckedAt = vi.fn<ManifestRegistry['getLastCheckedAt']>(
      async () => 0
    )
    const registry = {
      ready: Promise.resolve(),
      update,
      getPendingUpdates,
      applyUpdates: vi.fn(async () => {}),
      recordChecked: vi.fn(async () => {}),
      listManifests,
      getLastCheckedAt,
    }
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => true
    )
    const service = buildService({
      providerConfigService: { hasSeeded },
      registry,
    })

    await expect(service.refreshCatalog()).rejects.toThrow(
      /no sources this version can use/
    )
  })
})

describe('ProviderService.setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers an onInstalled listener to seed the catalog', () => {
    const onChange = vi.fn<ProviderConfigService['options']['onChange']>()
    const getAll = vi.fn<ProviderConfigService['getAll']>(async () => [])
    const service = buildService({
      providerConfigService: { options: { onChange }, getAll },
    })

    service.setup()

    expect(fakeBrowser.runtime.onInstalled.hasListeners()).toBe(true)
  })
})

describe('ProviderService.seedDefaultProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const DEFAULT_MANIFESTS = [
    { id: 'dandanplay', name: '弹弹play' },
    { id: 'bilibili', name: 'B站' },
    { id: 'tencent', name: '腾讯视频' },
  ]

  function buildForSeed(opts: {
    seeded?: boolean
    manifests?: { id: string; name: string }[]
    lang?: Language
    catalog?: 'synced' | 'unreachable' | 'empty'
    existingConfigs?: ProviderConfig[]
  }) {
    let seeded = opts.seeded ?? false
    const set = vi.fn<ProviderConfigService['options']['set']>(
      async (_configs) => {}
    )
    const onChange = vi.fn<ProviderConfigService['options']['onChange']>()
    const markSeeded = vi.fn<ProviderConfigService['markSeeded']>(async () => {
      seeded = true
    })
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => seeded
    )
    const getAll = vi.fn<ProviderConfigService['getAll']>(
      async () => opts.existingConfigs ?? []
    )
    const providerConfigService = {
      options: { set, onChange },
      markSeeded,
      hasSeeded,
      getAll,
    }

    const listManifests = vi.fn(() => opts.manifests ?? DEFAULT_MANIFESTS)
    const recordChecked = vi.fn<ManifestRegistry['recordChecked']>(
      async () => {}
    )
    const update = vi.fn<ManifestRegistry['update']>(
      async () => opts.catalog ?? 'synced'
    )
    const getPendingUpdates = vi.fn<ManifestRegistry['getPendingUpdates']>(
      async () => []
    )
    const registry = {
      ready: Promise.resolve(),
      update,
      getPendingUpdates,
      recordChecked,
      listManifests,
    }

    const service = buildService({
      providerConfigService,
      registry,
      extensionOptions: { get: makeExtensionOptionsGet(opts.lang) },
    })

    return { service, set, markSeeded, hasSeeded, listManifests, recordChecked }
  }

  it('seeds the preloaded set with manifest-derived names on a fresh install', async () => {
    const { service, set, markSeeded } = buildForSeed({})

    await service.seedDefaultProviders()

    expect(set).toHaveBeenCalledTimes(1)
    const configs = set.mock.calls[0][0]
    expect(configs.map((c) => c.manifestId)).toEqual([
      'dandanplay',
      'bilibili',
      'tencent',
    ])
    expect(configs.map((c) => c.id)).toEqual([
      'dandanplay',
      'bilibili',
      'tencent',
    ])
    expect(configs.map((c) => c.name)).toEqual(['弹弹play', 'B站', '腾讯视频'])
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('resolves names in the active UI language', async () => {
    const { service, listManifests, set } = buildForSeed({
      lang: Language.en,
      manifests: [
        { id: 'dandanplay', name: 'DanDanPlay' },
        { id: 'bilibili', name: 'Bilibili' },
        { id: 'tencent', name: 'Tencent Video' },
      ],
    })

    await service.seedDefaultProviders()

    expect(listManifests).toHaveBeenCalledWith('en')
    const configs = set.mock.calls[0][0]
    expect(configs.find((c) => c.manifestId === 'tencent')?.name).toBe(
      'Tencent Video'
    )
  })

  it('maps the bare zh language to its manifest locale tag', async () => {
    const { service, listManifests } = buildForSeed({ lang: Language.zh })

    await service.seedDefaultProviders()

    expect(listManifests).toHaveBeenCalledWith('zh-CN')
  })

  it('does not seed once the flag is set, leaving an existing user untouched', async () => {
    const { service, set, markSeeded } = buildForSeed({ seeded: true })

    await service.seedDefaultProviders()

    expect(set).not.toHaveBeenCalled()
    expect(markSeeded).not.toHaveBeenCalled()
  })

  it('stays unseeded for a later retry when the catalog has no manifests yet', async () => {
    const { service, set, markSeeded } = buildForSeed({ manifests: [] })

    await service.seedDefaultProviders()

    expect(set).not.toHaveBeenCalled()
    expect(markSeeded).not.toHaveBeenCalled()
  })

  it('does not seed (or lock) a partial set when one preloaded manifest is still missing', async () => {
    const { service, set, markSeeded } = buildForSeed({
      manifests: [
        { id: 'dandanplay', name: '弹弹play' },
        { id: 'bilibili', name: 'B站' },
      ],
    })

    await service.seedDefaultProviders()

    expect(set).not.toHaveBeenCalled()
    expect(markSeeded).not.toHaveBeenCalled()
  })

  it('locks the flag without seeding when an existing install updates', async () => {
    const { service, set, markSeeded, hasSeeded } = buildForSeed({
      existingConfigs: [makeConfig('mine')],
    })

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update' })

    expect(markSeeded).toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    expect(hasSeeded).toHaveBeenCalled()
  })

  it('seeds when a brand-new install fires onInstalled', async () => {
    const { service, set, markSeeded } = buildForSeed({})

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' })

    expect(set).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('seeds from the bundled manifests when the catalog is unreachable', async () => {
    const { service, set, markSeeded, recordChecked } = buildForSeed({
      catalog: 'unreachable',
    })

    await expect(service.syncCatalog()).resolves.toBe('unreachable')

    expect(set).toHaveBeenCalledTimes(1)
    expect(set.mock.calls[0][0].map((c) => c.manifestId)).toEqual([
      'dandanplay',
      'bilibili',
      'tencent',
    ])
    expect(markSeeded).toHaveBeenCalledTimes(1)
    expect(recordChecked).not.toHaveBeenCalled()
  })

  it('does not seed on an unreachable catalog once the flag is locked', async () => {
    const { service, set, markSeeded } = buildForSeed({
      seeded: true,
      catalog: 'unreachable',
    })

    await service.syncCatalog()

    expect(set).not.toHaveBeenCalled()
    expect(markSeeded).not.toHaveBeenCalled()
  })

  it('seeds once when two syncs run at the same time', async () => {
    const { service, set, markSeeded } = buildForSeed({})

    await Promise.all([service.syncCatalog(), service.syncCatalog()])

    expect(set).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('locks the flag instead of writing over configs that already exist', async () => {
    const { service, set, markSeeded } = buildForSeed({
      existingConfigs: [makeConfig('mine')],
    })

    await service.seedDefaultProviders()

    expect(set).not.toHaveBeenCalled()
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('seeds an install whose first run never reached the seed when it updates', async () => {
    const { service, set, markSeeded } = buildForSeed({})

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update' })

    expect(set).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('does not re-seed an update install whose configs the user deleted', async () => {
    const { service, set, hasSeeded } = buildForSeed({ seeded: true })

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update' })

    // hasSeeded proves the handler ran; without it the negative assertion below
    // would also hold when no listener was registered at all.
    expect(hasSeeded).toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })
})

describe('ProviderService.deleteUserManifest', () => {
  function buildForDelete(opts: {
    kind?: 'preinstalled' | 'user'
    configs: { id: string; manifestId: string }[]
  }) {
    const unregister = vi.fn<ManifestRegistry['unregister']>(async () => {})
    const getSource = vi.fn<ManifestRegistry['getSource']>(async () =>
      opts.kind ? { manifest: {}, kind: opts.kind } : undefined
    )
    const getIdentityFields = vi.fn<ManifestRegistry['getIdentityFields']>(
      async () => []
    )
    const registry = {
      ready: Promise.resolve(),
      getSource,
      getIdentityFields,
      unregister,
    }

    const deleteFromStorage = vi.fn<ProviderConfigService['deleteFromStorage']>(
      async () => {}
    )
    const getAll = vi.fn<ProviderConfigService['getAll']>(
      async () => opts.configs as ProviderConfig[]
    )
    const providerConfigService = { getAll, deleteFromStorage }

    const deleteBySeasonIdentity = vi.fn<
      BookmarkService['deleteBySeasonIdentity']
    >(async () => {})
    const bookmarkService = { deleteBySeasonIdentity }

    const service = buildService({
      providerConfigService,
      factory: vi.fn(() => makeProvider()),
      registry,
      bookmarkService,
    })
    return { service, unregister, deleteFromStorage, deleteBySeasonIdentity }
  }

  it('removes the manifest configs and their bookmarks, then unregisters', async () => {
    const { service, unregister, deleteFromStorage, deleteBySeasonIdentity } =
      buildForDelete({
        kind: 'user',
        configs: [
          { id: 'cfg-1', manifestId: 'mine:one' },
          { id: 'cfg-2', manifestId: 'other' },
        ],
      })

    await service.deleteUserManifest('mine:one')

    expect(deleteFromStorage).toHaveBeenCalledTimes(1)
    expect(deleteFromStorage).toHaveBeenCalledWith('cfg-1')
    // cfg-1 has no baseUrl, so its namespaceKey falls back to its manifestId.
    expect(deleteBySeasonIdentity).toHaveBeenCalledWith('mine:one', 'mine:one')
    expect(unregister).toHaveBeenCalledWith('mine:one')
  })

  it('refuses a preinstalled manifest', async () => {
    const { service, unregister, deleteFromStorage } = buildForDelete({
      kind: 'preinstalled',
      configs: [{ id: 'cfg-1', manifestId: 'bilibili' }],
    })

    await expect(service.deleteUserManifest('bilibili')).rejects.toThrow(
      /user manifests/
    )
    expect(deleteFromStorage).not.toHaveBeenCalled()
    expect(unregister).not.toHaveBeenCalled()
  })

  it('refuses an unknown manifest id', async () => {
    const { service, unregister } = buildForDelete({ configs: [] })

    await expect(service.deleteUserManifest('missing')).rejects.toThrow(
      /user manifests/
    )
    expect(unregister).not.toHaveBeenCalled()
  })
})

/**
 * setup() kicks off the once-per-session season identity reconcile. The
 * namespace it stamps is derived from the manifest's identityFields
 * declaration, so a registry that has not loaded the manifest yet must not
 * hand the reconciler an empty declaration: that collapses a self-hosted
 * config onto the manifest's shared namespace and drops the providerConfigId
 * that could correct it later.
 */
interface ReconciledConfig {
  id: string
  manifestId: string
  configValues?: Record<string, unknown>
  identityFields?: readonly string[]
}

describe('ProviderService.setup reconcile', () => {
  const SELF_HOSTED_DDP: ProviderConfig = {
    id: 'd9d068cc-d7a5-4277-990b-73b28f7637f8',
    manifestId: 'dandanplay',
    name: 'Self hosted',
    enabled: true,
    configValues: { baseUrl: 'https://ddp.selfhosted.example' },
  }

  function buildForReconcile(identityFields: Record<string, string[]>) {
    const reconcileIdentities = vi.fn(async (_configs: ReconciledConfig[]) => 0)
    const seasonService = { reconcileIdentities } as unknown as SeasonService

    const providerConfigService = {
      getAll: vi.fn(async () => [
        SELF_HOSTED_DDP,
        makeConfig(LEGACY_MACCMS_ID),
      ]),
      options: { onChange: vi.fn() },
    } as unknown as ProviderConfigService

    const registry = {
      ready: Promise.resolve(true),
      getIdentityFieldsMap: vi.fn(async () => identityFields),
    } as unknown as ManifestRegistry

    const service = new ProviderService(
      {} as unknown as DanmakuService,
      seasonService,
      providerConfigService,
      vi.fn(),
      registry,
      {} as unknown as BookmarkService,
      silentLogger,
      silentExtensionOptions
    )

    return { service, reconcileIdentities }
  }

  async function reconciledConfigs(
    identityFields: Record<string, string[]>
  ): Promise<ReconciledConfig[]> {
    const { service, reconcileIdentities } = buildForReconcile(identityFields)

    service.setup()
    await vi.waitFor(() => expect(reconcileIdentities).toHaveBeenCalled())

    return reconcileIdentities.mock.calls.at(0)?.[0] ?? []
  }

  it('reconciles once per browser session', async () => {
    const first = buildForReconcile({ dandanplay: ['baseUrl'] })
    first.service.setup()
    await vi.waitFor(() => expect(first.reconcileIdentities).toHaveBeenCalled())
    await vi.waitFor(async () => {
      expect(await chrome.storage.session.get(null)).not.toEqual({})
    })

    // A second service worker start within the same browser session must not
    // reconcile again, which only holds if the guard key outlives the pass.
    const second = buildForReconcile({ dandanplay: ['baseUrl'] })
    second.service.setup()

    // Waiting for an absence needs a real window: without the guard the second
    // pass does reconcile, it just takes a few async turns to get there, so
    // asserting immediately would pass for the wrong reason.
    const reconciledAgain = await vi
      .waitFor(
        () => {
          expect(second.reconcileIdentities).toHaveBeenCalled()
          return true
        },
        { timeout: 2000 }
      )
      .catch(() => false)

    expect(reconciledAgain).toBe(false)
  })

  it('does not declare identity fields for a manifest the registry has not loaded', async () => {
    const configs = await reconciledConfigs({})
    const selfHosted = configs.find((c) => c.manifestId === 'dandanplay')

    expect(selfHosted?.identityFields).toBeUndefined()
  })

  it('declares the manifest identity fields once the registry has loaded it', async () => {
    const configs = await reconciledConfigs({ dandanplay: ['baseUrl'] })
    const selfHosted = configs.find((c) => c.manifestId === 'dandanplay')

    expect(selfHosted?.identityFields).toEqual(['baseUrl'])
  })

  it('declares no identity fields for legacy MacCMS, which has no manifest', async () => {
    const configs = await reconciledConfigs({ dandanplay: ['baseUrl'] })
    const maccms = configs.find((c) => c.manifestId === LEGACY_MACCMS_ID)

    expect(maccms?.identityFields).toEqual([])
  })
})
