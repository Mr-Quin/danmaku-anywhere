import {
  DanmakuSourceType,
  type EpisodeMeta,
  LEGACY_MACCMS_ID,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { SeasonService } from '@/background/services/persistence/SeasonService'
import type { ILogger } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import type { IDanmakuProvider } from './IDanmakuProvider'
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
  opts: { findExisting?: unknown; existingDanmaku?: unknown[] } = {}
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
    silentLogger
  )

  return { service, provider, danmakuService, seasonService }
}

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
      update: vi.fn(async () => {}),
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
    } as unknown as ProviderConfigService

    const service = new ProviderService(
      {} as unknown as DanmakuService,
      {} as unknown as SeasonService,
      providerConfigService,
      vi.fn(),
      registry,
      silentLogger
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
      silentLogger
    )

    service.setup()

    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled()
  })
})
