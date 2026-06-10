import {
  DanmakuSourceType,
  type EpisodeMeta,
  LEGACY_MACCMS_ID,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookmarkService } from '@/background/services/persistence/BookmarkService'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { SeasonService } from '@/background/services/persistence/SeasonService'
import type { ILogger } from '@/common/Logger'
import type { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import type { IDanmakuProvider } from './IDanmakuProvider'
import { MANIFEST_RUN_OPTIONS } from './ManifestProviderService'
import type { ManifestRegistry } from './ManifestRegistry'
import { ProviderService } from './ProviderService'

/**
 * ProviderService keys legacy custom-danmaku behavior off the config's
 * manifestId (LEGACY_MACCMS_ID), not the season/episode `provider` tag. This
 * lets a generic catalog source (any registered manifest) search, fetch
 * episodes, and fetch danmaku without tripping the MacCMS-only guards, while
 * MacCMS keeps its bespoke restrictions.
 */

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  sub: () => silentLogger,
} as unknown as ILogger

const silentExtensionOptions = {
  get: async () => ({ lang: 'zh' }),
} as unknown as ExtensionOptionsService

function makeConfig(
  manifestId: string,
  impl: DanmakuSourceType
): ProviderConfig {
  return {
    id: `${manifestId}-1`,
    manifestId,
    impl,
    name: manifestId,
    enabled: true,
    isBuiltIn: false,
    configValues: {},
  }
}

function makeProvider(
  overrides: Record<string, unknown> = {}
): IDanmakuProvider {
  return {
    forProvider: DanmakuSourceType.DanDanPlay,
    search: vi.fn(async () => []),
    getEpisodes: vi.fn(async () => []),
    getDanmaku: vi.fn(async () => []),
    ...overrides,
  } as unknown as IDanmakuProvider
}

function build(
  config: ProviderConfig,
  provider: IDanmakuProvider,
  opts: {
    findExisting?: unknown
    existingDanmaku?: unknown[]
    configMissing?: boolean
  } = {}
) {
  const danmakuService = {
    filter: vi.fn(async () => opts.existingDanmaku ?? []),
    upsert: vi.fn(async (e: unknown) => e),
  } as unknown as DanmakuService

  const season = {
    id: 1,
    providerConfigId: config.id,
    providerIds: { animeId: 42 },
    provider: config.impl,
    title: 'Show',
  }

  const seasonService = {
    mustGetById: vi.fn(async () => season),
    findExisting: vi.fn(async () => opts.findExisting),
  } as unknown as SeasonService

  const providerConfigService = {
    mustGet: vi.fn(async () => config),
    get: vi.fn(async () => (opts.configMissing ? undefined : config)),
  } as unknown as ProviderConfigService

  const factory = vi.fn(() => provider)

  const registry = {
    ready: Promise.resolve(true),
  } as unknown as ManifestRegistry

  const service = new ProviderService(
    danmakuService,
    seasonService,
    providerConfigService,
    factory,
    registry,
    {} as unknown as BookmarkService,
    silentLogger,
    silentExtensionOptions
  )

  return { service, provider, danmakuService, seasonService }
}

describe('ProviderService.probeLogin', () => {
  it('runs the login probe with the private-host opt-in', async () => {
    const runLoginProbe = vi.fn(async () => true)
    const registry = {
      ready: Promise.resolve(true),
      getRunner: vi.fn(() => ({ runLoginProbe })),
    } as unknown as ManifestRegistry
    const service = new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      {} as unknown as ProviderConfigService,
      vi.fn(() => makeProvider()),
      registry,
      {} as unknown as BookmarkService,
      silentLogger,
      silentExtensionOptions
    )

    await service.probeLogin('dandanplay')

    expect(runLoginProbe).toHaveBeenCalledWith(undefined, MANIFEST_RUN_OPTIONS)
  })
})

describe('ProviderService.getManifestSpec', () => {
  function buildWithManifest(manifest: Record<string, unknown>) {
    const registry = {
      ready: Promise.resolve(true),
      getRunner: vi.fn(() => ({ manifest })),
    } as unknown as ManifestRegistry
    return new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      {} as unknown as ProviderConfigService,
      vi.fn(() => makeProvider()),
      registry,
      {} as unknown as BookmarkService,
      silentLogger,
      silentExtensionOptions
    )
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
      const { service } = build(
        makeConfig('iqiyi', DanmakuSourceType.DanDanPlay),
        provider
      )

      await expect(service.fetchEpisodesBySeason(1)).resolves.toEqual([])
      expect(provider.getEpisodes).toHaveBeenCalledWith({ animeId: 42 })
    })

    it('throws for a legacy MacCMS config', async () => {
      const provider = makeProvider()
      const { service } = build(
        makeConfig(LEGACY_MACCMS_ID, DanmakuSourceType.MacCMS),
        provider
      )

      await expect(service.fetchEpisodesBySeason(1)).rejects.toThrow(
        'MacCMS does not support fetching episodes'
      )
      expect(provider.getEpisodes).not.toHaveBeenCalled()
    })

    it('throws a source-removed error when the season is orphaned', async () => {
      const provider = makeProvider()
      const { service } = build(
        makeConfig('iqiyi', DanmakuSourceType.DanDanPlay),
        provider,
        { configMissing: true }
      )

      await expect(service.fetchEpisodesBySeason(1)).rejects.toThrow(
        'This source has been removed'
      )
      expect(provider.getEpisodes).not.toHaveBeenCalled()
    })
  })

  describe('searchSeason', () => {
    it('resolves a generic source result against existing seasons (not a custom-season cast)', async () => {
      const insert = {
        provider: DanmakuSourceType.DanDanPlay,
        indexedId: 'x',
        title: 'A',
      }
      const existing = { ...insert, id: 99 }
      const provider = makeProvider({ search: vi.fn(async () => [insert]) })
      const { service, seasonService } = build(
        makeConfig('iqiyi', DanmakuSourceType.DanDanPlay),
        provider,
        { findExisting: existing }
      )

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
        provider: DanmakuSourceType.MacCMS,
        indexedId: 'c',
        title: 'C',
      }
      const provider = makeProvider({
        search: vi.fn(async () => [customSeason]),
      })
      const { service, seasonService } = build(
        makeConfig(LEGACY_MACCMS_ID, DanmakuSourceType.MacCMS),
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
    const meta = {
      provider: DanmakuSourceType.DanDanPlay,
      indexedId: 'ep1',
      seasonId: 1,
      providerIds: {},
      season: { id: 1, providerConfigId: 'iqiyi-1' },
    } as unknown as WithSeason<EpisodeMeta>

    it('fetches danmaku for a generic source', async () => {
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service } = build(
        makeConfig('iqiyi', DanmakuSourceType.DanDanPlay),
        provider
      )

      await service.getDanmaku({ type: 'by-meta', meta, options: {} })

      expect(provider.getDanmaku).toHaveBeenCalled()
    })

    it('serves cached danmaku without fetching or resolving the config', async () => {
      const cached = { id: 5, comments: [] }
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service } = build(
        makeConfig('iqiyi', DanmakuSourceType.DanDanPlay),
        provider,
        { existingDanmaku: [cached] }
      )

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
      const maccmsMeta = {
        ...meta,
        season: { id: 1, providerConfigId: `${LEGACY_MACCMS_ID}-1` },
      } as unknown as WithSeason<EpisodeMeta>
      const { service } = build(
        makeConfig(LEGACY_MACCMS_ID, DanmakuSourceType.MacCMS),
        provider
      )

      await expect(
        service.getDanmaku({ type: 'by-meta', meta: maccmsMeta, options: {} })
      ).rejects.toThrow('MacCMS episodes are not refetchable')
      expect(provider.getDanmaku).not.toHaveBeenCalled()
    })

    it('throws a source-removed error when forcing an orphaned season', async () => {
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service } = build(
        makeConfig('iqiyi', DanmakuSourceType.DanDanPlay),
        provider,
        { configMissing: true }
      )

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
    const applyUpdates = vi.fn(async () => {})
    const recordChecked = vi.fn(async () => {})
    const registry = {
      ready: Promise.resolve(true),
      update: vi.fn(async () => true),
      getPendingUpdates: vi.fn(async () => opts.pending),
      applyUpdates,
      recordChecked,
      listManifests: vi.fn(() => []),
      getLastCheckedAt: vi.fn(async () => 0),
    } as unknown as ManifestRegistry

    const providerConfigService = {
      getAll: vi.fn(async () =>
        opts.installedManifestIds.map((manifestId) =>
          makeConfig(manifestId, DanmakuSourceType.DanDanPlay)
        )
      ),
      hasSeeded: vi.fn(async () => true),
    } as unknown as ProviderConfigService

    const service = new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      providerConfigService,
      vi.fn(),
      registry,
      {} as unknown as BookmarkService,
      silentLogger,
      silentExtensionOptions
    )

    return { service, applyUpdates, recordChecked }
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

  it('stamps lastCheckedAt after bringing the catalog current', async () => {
    const { service, recordChecked } = buildForRefresh({
      pending: [],
      installedManifestIds: [],
    })

    await service.refreshCatalog()

    expect(recordChecked).toHaveBeenCalledTimes(1)
  })

  it('does not record a check when the catalog index fetch fails', async () => {
    const recordChecked = vi.fn(async () => {})
    const getPendingUpdates = vi.fn(async () => [])
    const registry = {
      ready: Promise.resolve(true),
      update: vi.fn(async () => false),
      getPendingUpdates,
      applyUpdates: vi.fn(async () => {}),
      recordChecked,
      listManifests: vi.fn(() => []),
      getLastCheckedAt: vi.fn(async () => 0),
    } as unknown as ManifestRegistry
    const service = new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      {} as unknown as ProviderConfigService,
      vi.fn(),
      registry,
      {} as unknown as BookmarkService,
      silentLogger,
      silentExtensionOptions
    )

    await service.refreshCatalog()

    expect(getPendingUpdates).not.toHaveBeenCalled()
    expect(recordChecked).not.toHaveBeenCalled()
  })
})

describe('ProviderService.setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers an onInstalled listener to seed the catalog', () => {
    const registry = {
      ready: Promise.resolve(true),
    } as unknown as ManifestRegistry
    const service = new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      {} as unknown as ProviderConfigService,
      vi.fn(),
      registry,
      {} as unknown as BookmarkService,
      silentLogger,
      silentExtensionOptions
    )

    service.setup()

    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled()
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
    lang?: string
  }) {
    let seeded = opts.seeded ?? false
    const set = vi.fn(async (_configs: ProviderConfig[]) => {})
    const markSeeded = vi.fn(async () => {
      seeded = true
    })
    const hasSeeded = vi.fn(async () => seeded)
    const providerConfigService = {
      options: { set },
      markSeeded,
      hasSeeded,
      getAll: vi.fn(async () => []),
    } as unknown as ProviderConfigService

    const listManifests = vi.fn(() => opts.manifests ?? DEFAULT_MANIFESTS)
    const registry = {
      ready: Promise.resolve(true),
      update: vi.fn(async () => true),
      getPendingUpdates: vi.fn(async () => []),
      recordChecked: vi.fn(async () => {}),
      listManifests,
    } as unknown as ManifestRegistry

    const extensionOptions = {
      get: async () => ({ lang: opts.lang ?? 'zh' }),
    } as unknown as ExtensionOptionsService

    const service = new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      providerConfigService,
      vi.fn(),
      registry,
      {} as unknown as BookmarkService,
      silentLogger,
      extensionOptions
    )

    return { service, set, markSeeded, hasSeeded, listManifests }
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
      lang: 'en',
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
    const { service, listManifests } = buildForSeed({ lang: 'zh' })

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
    const { service, set, markSeeded, hasSeeded } = buildForSeed({})

    service.setup()
    const calls = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls
    const listener = calls.at(-1)?.[0] as (details: {
      reason: string
    }) => Promise<void>
    await listener({ reason: 'update' })

    expect(markSeeded).toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    expect(hasSeeded).toHaveBeenCalled()
  })

  it('seeds when a brand-new install fires onInstalled', async () => {
    const { service, set, markSeeded } = buildForSeed({})

    service.setup()
    const calls = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls
    const listener = calls.at(-1)?.[0] as (details: {
      reason: string
    }) => Promise<void>
    await listener({ reason: 'install' })

    expect(set).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })
})

describe('ProviderService.deleteUserManifest', () => {
  function buildForDelete(opts: {
    kind?: 'preinstalled' | 'user'
    configs: { id: string; manifestId: string }[]
  }) {
    const unregister = vi.fn(async () => {})
    const registry = {
      ready: Promise.resolve(true),
      getSource: vi.fn(async () =>
        opts.kind ? { manifest: {}, kind: opts.kind } : undefined
      ),
      unregister,
    } as unknown as ManifestRegistry
    const deleteFromStorage = vi.fn(async () => {})
    const providerConfigService = {
      getAll: vi.fn(async () => opts.configs),
      deleteFromStorage,
    } as unknown as ProviderConfigService
    const deleteByProviderConfigId = vi.fn(async () => {})
    const bookmarkService = {
      deleteByProviderConfigId,
    } as unknown as BookmarkService
    const service = new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      providerConfigService,
      vi.fn(() => makeProvider()),
      registry,
      bookmarkService,
      silentLogger,
      silentExtensionOptions
    )
    return { service, unregister, deleteFromStorage, deleteByProviderConfigId }
  }

  it('removes the manifest configs and their bookmarks, then unregisters', async () => {
    const { service, unregister, deleteFromStorage, deleteByProviderConfigId } =
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
    expect(deleteByProviderConfigId).toHaveBeenCalledWith('cfg-1')
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
