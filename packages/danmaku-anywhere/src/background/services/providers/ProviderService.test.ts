import 'fake-indexeddb/auto'
import {
  type CommentEntity,
  DanmakuSourceType,
  type EpisodeMeta,
  LEGACY_MACCMS_ID,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { err, ok } from '@danmaku-anywhere/result'
import type { ManifestRunner } from '@mr-quin/dango'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { BookmarkService } from '@/background/services/persistence/BookmarkService'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { AppError } from '@/common/errors/AppError'
import { LoggerSymbol } from '@/common/Logger'
import { Language } from '@/common/localization/language'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  capabilitiesFromManifest,
  LEGACY_MACCMS_CAPABILITIES,
  type SourceCapabilities,
  type SourceStatus,
} from '@/common/providers/sourceCapabilities'
import {
  createTestContainer,
  type TestContainerOverride,
} from '@/tests/createTestContainer'
import { makeSeason, makeSeasonInsert } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import type { SourceProvider } from './IDanmakuProvider'
import { MANIFEST_RUN_OPTIONS } from './ManifestProviderService'
import { ManifestRegistry } from './ManifestRegistry'
import { DanmakuProviderFactory } from './ProviderFactory'
import { ProviderService } from './ProviderService'

const UNREACHABLE = new AppError('network', { target: { kind: 'catalog' } })

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
    customName: manifestId,
    enabled: true,
    configValues: {},
  }
}

type ProviderDouble = Pick<
  SourceProvider,
  'kind' | 'getStatus' | 'search' | 'getEpisodes' | 'getDanmaku'
>

const MANIFEST_CAPABILITIES = capabilitiesFromManifest({
  search: {},
  episodes: {},
  danmaku: {},
})

function available(capabilities: SourceCapabilities) {
  return vi.fn(
    async (): Promise<SourceStatus> => ({ status: 'available', capabilities })
  )
}

function makeProvider(overrides: Partial<ProviderDouble> = {}): ProviderDouble {
  return {
    kind: 'source',
    getStatus: available(MANIFEST_CAPABILITIES),
    search: vi.fn(async () => []),
    getEpisodes: vi.fn(async () => ({ episodes: [], partial: false })),
    getDanmaku: vi.fn(async () => []),
    ...overrides,
  }
}

function makeMacCmsProvider(results: unknown[] = []) {
  return {
    kind: 'searchOnly' as const,
    getStatus: available(LEGACY_MACCMS_CAPABILITIES),
    search: vi.fn(async () => results),
  }
}

interface ServiceDoubles {
  danmakuService?: unknown
  seasonService?: unknown
  providerConfigService?: unknown
  factory?: unknown
  registry?: unknown
  bookmarkService?: unknown
  providerConfigWriter?: unknown
  logger?: unknown
  extensionOptions?: unknown
}

// Every ProviderService test builds the service through a real container so
// each collaborator double is typed against the class it stands in for
// instead of blanket-casting the whole constructor argument list. A test
// only overrides the collaborators its scenario actually touches.
function runBatch<T>(run: () => Promise<T>): Promise<T> {
  return run()
}

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
      value: doubles.registry ?? { displayNames: async () => new Map() },
    },
    { identifier: BookmarkService, value: doubles.bookmarkService ?? {} },
    {
      identifier: ProviderConfigWriter,
      value: doubles.providerConfigWriter ?? {},
    },
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

function comments(count: number): CommentEntity[] {
  return Array.from({ length: count }, (_, i) => ({
    p: `${i},1,16777215`,
    m: `comment ${i}`,
  }))
}

function build(
  config: ProviderConfig,
  provider: object,
  opts: {
    findExisting?: unknown
    existingDanmaku?: unknown[]
    configMissing?: boolean
    manifests?: { id: string; name: string }[]
  } = {}
) {
  const filter = vi.fn(async () => opts.existingDanmaku ?? [])
  const upsertUnlessFewer = vi.fn<DanmakuService['upsertUnlessFewer']>(
    async (episode) => ({
      episode: { ...episode, id: 1, version: 1, timeUpdated: 0 },
    })
  )
  const danmakuService = { filter, upsertUnlessFewer }

  const season = makeSeason({
    manifestId: config.manifestId,
    providerConfigId: config.id,
    providerIds: { animeId: 42 },
    title: 'Show',
  })

  const mustGetById = vi.fn<SeasonService['mustGetById']>(async () => season)
  // findExisting<T extends SeasonInsert> is generic; a double can't satisfy
  // that signature without an unsafe cast, so it stays untyped here.
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

  const displayNames = vi.fn(async () => {
    return new Map(
      (opts.manifests ?? []).map((manifest) => [manifest.id, manifest.name])
    )
  })
  const service = buildService({
    danmakuService,
    seasonService,
    providerConfigService,
    factory,
    registry: { displayNames },
  })

  return { service, provider, danmakuService, seasonService }
}

describe('ProviderService.probeLogin', () => {
  it('runs the login probe with the private-host opt-in', async () => {
    const runLoginProbe = vi.fn(async () => true)
    // runLoginProbe<T = unknown> is generic, so a vi.fn double can't satisfy
    // ManifestRunner's real signature without an unsafe cast.
    const getRunner = vi.fn<ManifestRegistry['getRunner']>(
      async () => ({ runLoginProbe }) as unknown as ManifestRunner // lint-specs-allow-cast: generic method signature, see comment above
    )
    const service = buildService({
      factory: vi.fn(() => makeProvider()),
      registry: { getRunner },
    })

    expect(await service.probeLogin('dandanplay')).toBe(true)

    expect(runLoginProbe).toHaveBeenCalledWith(undefined, MANIFEST_RUN_OPTIONS)
  })

  it('rejects a probe output that is not a boolean', async () => {
    const runLoginProbe = vi.fn(async () => ({ isLogin: true }))
    const getRunner = vi.fn<ManifestRegistry['getRunner']>(
      async () => ({ runLoginProbe }) as unknown as ManifestRunner // lint-specs-allow-cast: generic method signature, see the test above
    )
    const service = buildService({
      factory: vi.fn(() => makeProvider()),
      registry: { getRunner },
    })

    await expect(service.probeLogin('bilibili')).rejects.toEqual(
      expect.objectContaining({ code: 'manifest.badOutput' })
    )
  })
})

describe('ProviderService.getManifestSpec', () => {
  function buildWithManifest(manifest: Record<string, unknown>) {
    const getRunner = vi.fn<ManifestRegistry['getRunner']>(
      async () => ({ manifest }) as ManifestRunner
    )
    return buildService({
      factory: vi.fn(() => makeProvider()),
      registry: { getRunner },
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
    const getRunner = vi.fn<ManifestRegistry['getRunner']>(async () => {
      throw new Error('no manifest registered with id: missing')
    })
    const service = buildService({
      factory: vi.fn(() => makeProvider()),
      registry: { getRunner },
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
        getEpisodes: vi.fn(async () => ({ episodes: [], partial: false })),
      })
      const { service } = build(makeConfig('iqiyi'), provider)

      await expect(service.fetchEpisodesBySeason(1)).resolves.toEqual([])
      expect(provider.getEpisodes).toHaveBeenCalledWith({ animeId: 42 })
    })

    it('throws for a legacy MacCMS config, whose provider has no episode fetch', async () => {
      const { service } = build(
        makeConfig(LEGACY_MACCMS_ID),
        makeMacCmsProvider()
      )

      await expect(service.fetchEpisodesBySeason(1)).rejects.toMatchObject({
        code: 'source.episodesUnsupported',
        params: {
          source: expect.objectContaining({ name: LEGACY_MACCMS_ID }),
        },
      })
    })

    it('names a source on the default name by its manifest name', async () => {
      const config = { ...makeConfig('iqiyi'), customName: null }
      const { service } = build(
        config,
        makeProvider({
          getStatus: available(capabilitiesFromManifest({ search: {} })),
        }),
        { manifests: [{ id: 'iqiyi', name: '爱奇艺' }] }
      )

      await expect(service.fetchEpisodesBySeason(1)).rejects.toMatchObject({
        code: 'source.episodesUnsupported',
        params: { source: expect.objectContaining({ name: '爱奇艺' }) },
      })
    })

    it('throws a source-removed error when the season is orphaned', async () => {
      const provider = makeProvider()
      const { service } = build(makeConfig('iqiyi'), provider, {
        configMissing: true,
      })

      await expect(service.fetchEpisodesBySeason(1)).rejects.toMatchObject({
        code: 'source.removed',
      })
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
        search: vi.fn<SourceProvider['search']>(async () => [insert]),
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
      const provider = makeMacCmsProvider([customSeason])
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
        providerConfigId: iqiyiConfig.id,
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

      expect(result).toEqual({ episode: cached })
      expect(provider.getDanmaku).not.toHaveBeenCalled()
    })

    it('saves an empty result on a first manual fetch', async () => {
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service, danmakuService } = build(iqiyiConfig, provider)

      const result = await service.getDanmaku({
        type: 'by-meta',
        meta,
        options: {},
      })

      expect(danmakuService.upsertUnlessFewer).toHaveBeenCalledWith(
        expect.objectContaining({ comments: [], commentCount: 0 })
      )
      expect(result.keptStored).toBeUndefined()
    })

    it('never saves an empty result from an automatic fetch', async () => {
      const provider = makeProvider({ getDanmaku: vi.fn(async () => []) })
      const { service, danmakuService } = build(iqiyiConfig, provider)

      await expect(
        service.getDanmaku({
          type: 'by-meta',
          meta,
          options: { automatic: true },
        })
      ).rejects.toMatchObject({
        code: 'source.noDanmaku',
        params: { title: meta.title },
      })
      expect(danmakuService.upsertUnlessFewer).not.toHaveBeenCalled()
    })

    it('saves a non-empty result from an automatic fetch', async () => {
      const provider = makeProvider({
        getDanmaku: vi.fn(async () => comments(2)),
      })
      const { service, danmakuService } = build(iqiyiConfig, provider)

      await service.getDanmaku({
        type: 'by-meta',
        meta,
        options: { automatic: true },
      })

      expect(danmakuService.upsertUnlessFewer).toHaveBeenCalledWith(
        expect.objectContaining({ commentCount: 2 })
      )
    })

    it('throws for a legacy MacCMS config, whose provider cannot refetch danmaku', async () => {
      const maccmsConfig = makeConfig(LEGACY_MACCMS_ID)
      const maccmsMeta = {
        ...meta,
        season: {
          id: 1,
          manifestId: maccmsConfig.manifestId,
          providerConfigId: maccmsConfig.id,
        },
      } as WithSeason<EpisodeMeta>
      const { service } = build(maccmsConfig, makeMacCmsProvider())

      await expect(
        service.getDanmaku({ type: 'by-meta', meta: maccmsMeta, options: {} })
      ).rejects.toMatchObject({
        code: 'source.danmakuUnsupported',
      })
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
      ).rejects.toMatchObject({ code: 'source.removed' })
      expect(provider.getDanmaku).not.toHaveBeenCalled()
    })
  })
})

describe('ProviderService capability gates', () => {
  const searchOnly = capabilitiesFromManifest({ search: {} })
  const config = makeConfig('search-only')

  it('refuses to search a manifest without a search pipeline', async () => {
    const provider = makeProvider({
      getStatus: available(capabilitiesFromManifest({ episodes: {} })),
    })
    const { service } = build(config, provider)

    await expect(
      service.searchSeason({ providerConfigId: config.id, keyword: 'a' })
    ).rejects.toMatchObject({
      code: 'source.searchUnsupported',
    })
    expect(provider.search).not.toHaveBeenCalled()
  })

  it('refuses episodes for a manifest without an episodes pipeline', async () => {
    const provider = makeProvider({
      getStatus: available(searchOnly),
    })
    const { service } = build(config, provider)

    await expect(service.fetchEpisodesBySeason(1)).rejects.toMatchObject({
      code: 'source.episodesUnsupported',
      params: { source: expect.objectContaining({ name: config.customName }) },
    })
    expect(provider.getEpisodes).not.toHaveBeenCalled()
  })

  it('refuses danmaku for a manifest without a danmaku pipeline', async () => {
    const provider = makeProvider({
      getStatus: available(searchOnly),
    })
    const { service } = build(config, provider)
    const meta = {
      indexedId: 'ep1',
      seasonId: 1,
      providerIds: {},
      season: {
        id: 1,
        manifestId: config.manifestId,
        providerConfigId: config.id,
      },
    } as WithSeason<EpisodeMeta>

    await expect(
      service.getDanmaku({ type: 'by-meta', meta, options: {} })
    ).rejects.toMatchObject({
      code: 'source.danmakuUnsupported',
    })
    expect(provider.getDanmaku).not.toHaveBeenCalled()
  })

  it('refuses a season refresh when its manifest has no season pipeline', async () => {
    const season = makeSeason({
      manifestId: config.manifestId,
      providerConfigId: config.id,
    })
    const getSeason = vi.fn(async () => null)
    const upsert = vi.fn()
    const service = buildService({
      seasonService: { filter: vi.fn(async () => [season]), upsert },
      providerConfigService: { getAll: vi.fn(async () => [config]) },
      factory: vi.fn(() => ({
        kind: 'source',
        getStatus: available(MANIFEST_CAPABILITIES),
        getSeason,
      })),
    })

    await expect(
      service.refreshSeason({ id: season.id })
    ).rejects.toMatchObject({
      code: 'source.seasonRefreshUnsupported',
    })
    expect(getSeason).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })
})

describe('ProviderService.parseUrl', () => {
  it('falls through to the next source that can parse links', async () => {
    const first = makeConfig('first')
    const second = makeConfig('second')
    const parses = available(capabilitiesFromManifest({ parseUrl: {} }))
    const season = makeSeason()
    const missed = vi.fn(async () => null)
    const parsed = vi.fn(async () => ({
      seasonInsert: makeSeasonInsert(),
      episodeMeta: { title: 'E', indexedId: 'ep', providerIds: {} },
    }))
    const providers = new Map([
      [first.id, { kind: 'source', getStatus: parses, parseUrl: missed }],
      [second.id, { kind: 'source', getStatus: parses, parseUrl: parsed }],
    ])
    const service = buildService({
      providerConfigService: { getAll: vi.fn(async () => [first, second]) },
      seasonService: { upsert: vi.fn(async () => season) },
      factory: vi.fn((config: ProviderConfig) => providers.get(config.id)),
    })

    const result = await service.parseUrl('x.example/play/1')

    expect(result).toMatchObject({ indexedId: 'ep', season })
    expect(missed).toHaveBeenCalledWith('https://x.example/play/1')
  })

  it('throws a no-parser source error when no source can parse the URL', async () => {
    const { service } = build(makeConfig('iqiyi'), makeProvider())

    await expect(
      service.parseUrl('https://example.com/video/1')
    ).rejects.toMatchObject({ code: 'source.noUrlParser' })
  })
})

describe('ProviderService.getDanmaku against persisted episodes', () => {
  const config = makeConfig('iqiyi')
  let db: DanmakuAnywhereDb
  let danmakuService: DanmakuService

  beforeEach(async () => {
    await Dexie.delete(DANMAKU_DB_NAME)
    db = new DanmakuAnywhereDb()
    await db.open()
    danmakuService = new DanmakuService(new SeasonService(db), db, silentLogger)
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(DANMAKU_DB_NAME)
    vi.restoreAllMocks()
  })

  async function setup(storedComments?: CommentEntity[]) {
    const season = await new SeasonService(db).upsert(
      makeSeasonInsert({
        manifestId: config.manifestId,
        providerConfigId: config.id,
      })
    )
    const meta: WithSeason<EpisodeMeta> = {
      title: 'Episode 1',
      indexedId: 'ep1',
      seasonId: season.id,
      providerIds: {},
      schemaVersion: 4,
      lastChecked: 0,
      season,
    }
    if (storedComments) {
      const { season: _, ...insert } = meta
      await danmakuService.upsert({
        ...insert,
        comments: storedComments,
        commentCount: storedComments.length,
      })
    }

    const first = Promise.withResolvers<CommentEntity[]>()
    const second = Promise.withResolvers<CommentEntity[]>()
    const getDanmaku = vi
      .fn<SourceProvider['getDanmaku']>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const getAll = vi.fn<ProviderConfigService['getAll']>(async () => [config])
    const service = buildService({
      danmakuService,
      providerConfigService: { getAll },
      factory: vi.fn(() => makeProvider({ getDanmaku })),
    })

    function fetch(forceUpdate: boolean) {
      return service.getDanmaku({
        type: 'by-meta',
        meta,
        options: { forceUpdate },
      })
    }

    async function refetch(fetched: CommentEntity[]) {
      first.resolve(fetched)
      return fetch(true)
    }

    async function stored() {
      const [episode] = await danmakuService.filter({
        indexedId: meta.indexedId,
        seasonId: season.id,
      })
      return episode
    }

    return { first, second, getDanmaku, fetch, refetch, stored }
  }

  it('keeps the stored episode when the refetch returns fewer comments', async () => {
    const { refetch, stored } = await setup(comments(5))
    const before = await stored()

    const result = await refetch(comments(3))

    expect(result.keptStored).toEqual({ fetchedCount: 3, storedCount: 5 })
    expect(result.episode).toEqual(before)
    expect(await stored()).toEqual(before)
  })

  it('keeps the stored episode when the refetch returns nothing', async () => {
    const { refetch, stored } = await setup(comments(5))

    const result = await refetch([])

    expect(result.keptStored).toEqual({ fetchedCount: 0, storedCount: 5 })
    expect((await stored()).commentCount).toBe(5)
  })

  it('replaces the stored episode when the refetch returns as many comments', async () => {
    const { refetch, stored } = await setup(comments(3))

    const result = await refetch(comments(3))

    expect(result).not.toHaveProperty('keptStored')
    expect((await stored()).version).toBe(2)
  })

  it('records when the replacing refetch checked the source', async () => {
    const { refetch, stored } = await setup(comments(3))
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    await refetch(comments(4))

    expect((await stored()).lastChecked).toBe(1_700_000_000_000)
  })

  it('does not count stored comments the renderer cannot parse', async () => {
    const { refetch, stored } = await setup([
      ...comments(2),
      { p: '10,7,16777215', m: 'positioned' },
    ])

    const result = await refetch(comments(2))

    expect(result).not.toHaveProperty('keptStored')
    expect((await stored()).commentCount).toBe(2)
  })

  it('keeps the larger refetch when a smaller one resolves after it', async () => {
    const { first, second, getDanmaku, fetch, stored } = await setup(
      comments(3)
    )

    const refreshA = fetch(true)
    const refreshB = fetch(true)
    await vi.waitFor(() => expect(getDanmaku).toHaveBeenCalledTimes(2))

    first.resolve(comments(6))
    await expect(refreshA).resolves.not.toHaveProperty('keptStored')
    second.resolve(comments(4))
    await expect(refreshB).resolves.toMatchObject({
      keptStored: { fetchedCount: 4, storedCount: 6 },
    })

    const episode = await stored()
    expect(episode.comments).toHaveLength(6)
    expect(episode.commentCount).toBe(6)
  })

  it('keeps the larger first fetch when a smaller one resolves after it', async () => {
    const { first, second, getDanmaku, fetch, stored } = await setup()

    const fetchA = fetch(false)
    const fetchB = fetch(false)
    await vi.waitFor(() => expect(getDanmaku).toHaveBeenCalledTimes(2))

    first.resolve(comments(6))
    await expect(fetchA).resolves.not.toHaveProperty('keptStored')
    second.resolve(comments(4))
    await expect(fetchB).resolves.toMatchObject({
      keptStored: { fetchedCount: 4, storedCount: 6 },
    })

    const episode = await stored()
    expect(episode.comments).toHaveLength(6)
    expect(episode.commentCount).toBe(6)
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
    const update = vi.fn<ManifestRegistry['update']>(async () => ok('synced'))
    const listManifests = vi.fn<ManifestRegistry['listManifests']>(
      async () => []
    )
    const getLastCheckedAt = vi.fn<ManifestRegistry['getLastCheckedAt']>(
      async () => 0
    )
    let batchDepth = 0
    const registry = {
      update,
      getPendingUpdates,
      applyUpdates,
      recordChecked,
      listManifests,
      getLastCheckedAt,
      batchChanges: async <T>(run: () => Promise<T>): Promise<T> => {
        batchDepth += 1
        try {
          return await run()
        } finally {
          batchDepth -= 1
        }
      },
    }

    const getAll = vi.fn<ProviderConfigService['getAll']>(async () =>
      opts.installedManifestIds.map((manifestId) => makeConfig(manifestId))
    )
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => true
    )
    const providerConfigService = { getAll, hasSeeded }

    const service = buildService({ providerConfigService, registry })

    return {
      service,
      registry,
      applyUpdates,
      recordChecked,
      getPendingUpdates,
      inBatch: () => batchDepth > 0,
    }
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

  it('runs every registry write of a sync inside one batch', async () => {
    const { service, registry, inBatch } = buildForRefresh({
      pending: [
        { manifestId: 'iqiyi', fromVersion: '1.0.0', toVersion: '2.0.0' },
      ],
      installedManifestIds: [],
    })
    const callsInBatch: boolean[] = []
    registry.update.mockImplementation(async () => {
      callsInBatch.push(inBatch())
      return ok('synced')
    })
    registry.applyUpdates.mockImplementation(async () => {
      callsInBatch.push(inBatch())
    })
    registry.recordChecked.mockImplementation(async () => {
      callsInBatch.push(inBatch())
    })

    await service.refreshCatalog()

    expect(callsInBatch).toEqual([true, true, true])
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
    const update = vi.fn<ManifestRegistry['update']>(async () =>
      err(UNREACHABLE)
    )
    const listManifests = vi.fn<ManifestRegistry['listManifests']>(
      async () => []
    )
    const getLastCheckedAt = vi.fn<ManifestRegistry['getLastCheckedAt']>(
      async () => 0
    )
    const registry = {
      update,
      getPendingUpdates,
      applyUpdates: vi.fn(async () => {}),
      recordChecked,
      listManifests,
      getLastCheckedAt,
      batchChanges: runBatch,
    }
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => true
    )
    const service = buildService({
      providerConfigService: { hasSeeded },
      registry,
    })

    await expect(service.refreshCatalog()).rejects.toBe(UNREACHABLE)

    expect(getPendingUpdates).not.toHaveBeenCalled()
    expect(recordChecked).not.toHaveBeenCalled()
  })

  it('throws a fetch-free error when the catalog answers with nothing usable', async () => {
    const update = vi.fn<ManifestRegistry['update']>(async () => ok('empty'))
    const getPendingUpdates = vi.fn<ManifestRegistry['getPendingUpdates']>(
      async () => []
    )
    const listManifests = vi.fn<ManifestRegistry['listManifests']>(
      async () => []
    )
    const getLastCheckedAt = vi.fn<ManifestRegistry['getLastCheckedAt']>(
      async () => 0
    )
    const registry = {
      update,
      getPendingUpdates,
      applyUpdates: vi.fn(async () => {}),
      recordChecked: vi.fn(async () => {}),
      listManifests,
      getLastCheckedAt,
      batchChanges: runBatch,
    }
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => true
    )
    const service = buildService({
      providerConfigService: { hasSeeded },
      registry,
    })

    await expect(service.refreshCatalog()).rejects.toMatchObject({
      code: 'catalog.empty',
    })
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

  function buildForSeed(opts: {
    seeded?: boolean
    catalog?: 'synced' | 'unreachable' | 'empty'
    existingConfigs?: ProviderConfig[]
    seedError?: Error
  }) {
    let seeded = opts.seeded ?? false
    const markSeeded = vi.fn<ProviderConfigService['markSeeded']>(async () => {
      seeded = true
    })
    const hasSeeded = vi.fn<ProviderConfigService['hasSeeded']>(
      async () => seeded
    )
    const getAll = vi.fn<ProviderConfigService['getAll']>(
      async () => opts.existingConfigs ?? []
    )
    const providerConfigService = { markSeeded, hasSeeded, getAll }

    const seedBuiltins = vi.fn<ProviderConfigWriter['seedBuiltins']>(
      async () => {
        if (opts.seedError) {
          throw opts.seedError
        }
        return (opts.existingConfigs ?? []).length === 0
      }
    )

    const recordChecked = vi.fn<ManifestRegistry['recordChecked']>(
      async () => {}
    )
    const update = vi.fn<ManifestRegistry['update']>(async () => {
      const catalog = opts.catalog ?? 'synced'
      return catalog === 'unreachable' ? err(UNREACHABLE) : ok(catalog)
    })
    const getPendingUpdates = vi.fn<ManifestRegistry['getPendingUpdates']>(
      async () => []
    )
    const registry = {
      update,
      getPendingUpdates,
      recordChecked,
      listManifests: vi.fn(async () => []),
      batchChanges: runBatch,
    }

    const service = buildService({
      providerConfigService,
      providerConfigWriter: { seedBuiltins },
      registry,
    })

    return { service, seedBuiltins, markSeeded, hasSeeded, recordChecked }
  }

  it('seeds the built-ins and locks the flag on a fresh install', async () => {
    const { service, seedBuiltins, markSeeded } = buildForSeed({})

    await service.seedDefaultProviders()

    expect(seedBuiltins).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('does not seed once the flag is set, leaving an existing user untouched', async () => {
    const { service, seedBuiltins, markSeeded } = buildForSeed({
      seeded: true,
    })

    await service.seedDefaultProviders()

    expect(seedBuiltins).not.toHaveBeenCalled()
    expect(markSeeded).not.toHaveBeenCalled()
  })

  it('leaves the seed flag unset when the config write fails', async () => {
    const { service, markSeeded } = buildForSeed({
      seedError: new Error('QUOTA_BYTES quota exceeded'),
    })

    await expect(service.seedDefaultProviders()).rejects.toThrow(
      'QUOTA_BYTES quota exceeded'
    )
    expect(markSeeded).not.toHaveBeenCalled()
  })

  it('locks the flag without seeding when an existing install updates', async () => {
    const { service, seedBuiltins, markSeeded, hasSeeded } = buildForSeed({
      existingConfigs: [makeConfig('mine')],
    })

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'update',
      previousVersion: '1.5.0',
    })

    expect(markSeeded).toHaveBeenCalled()
    expect(seedBuiltins).not.toHaveBeenCalled()
    expect(hasSeeded).toHaveBeenCalled()
  })

  it('seeds when a brand-new install fires onInstalled', async () => {
    const { service, seedBuiltins, markSeeded } = buildForSeed({})

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' })

    expect(seedBuiltins).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('seeds when the catalog is unreachable', async () => {
    const { service, seedBuiltins, markSeeded, recordChecked } = buildForSeed({
      catalog: 'unreachable',
    })

    await expect(service.syncCatalog()).resolves.toEqual(err(UNREACHABLE))

    expect(seedBuiltins).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
    expect(recordChecked).not.toHaveBeenCalled()
  })

  it('does not seed on an unreachable catalog once the flag is locked', async () => {
    const { service, seedBuiltins, markSeeded } = buildForSeed({
      seeded: true,
      catalog: 'unreachable',
    })

    await service.syncCatalog()

    expect(seedBuiltins).not.toHaveBeenCalled()
    expect(markSeeded).not.toHaveBeenCalled()
  })

  it('seeds an install whose first run never reached the seed when it updates', async () => {
    const { service, seedBuiltins, markSeeded } = buildForSeed({})

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'update',
      previousVersion: '1.5.0',
    })

    expect(seedBuiltins).toHaveBeenCalledTimes(1)
    expect(markSeeded).toHaveBeenCalledTimes(1)
  })

  it('does not re-seed an update install whose configs the user deleted', async () => {
    const { service, seedBuiltins, hasSeeded } = buildForSeed({ seeded: true })

    service.setup()
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'update',
      previousVersion: '1.5.0',
    })

    // hasSeeded proves the handler ran; without it the negative assertion below
    // would also hold when no listener was registered at all.
    expect(hasSeeded).toHaveBeenCalled()
    expect(seedBuiltins).not.toHaveBeenCalled()
  })
})

describe('ProviderService.deleteUserManifest', () => {
  function buildForDelete(opts: { kind?: 'preinstalled' | 'user' }) {
    const unregister = vi.fn<ManifestRegistry['unregister']>(async () => {})
    const getSource = vi.fn<ManifestRegistry['getSource']>(async () =>
      opts.kind ? { manifest: {}, kind: opts.kind } : undefined
    )
    const registry = {
      getSource,
      unregister,
    }
    const deleteByManifest = vi.fn<ProviderConfigWriter['deleteByManifest']>(
      async () => {}
    )

    const service = buildService({
      factory: vi.fn(() => makeProvider()),
      registry,
      providerConfigWriter: { deleteByManifest },
    })
    return { service, unregister, deleteByManifest }
  }

  it('removes the manifest configs, then unregisters', async () => {
    const { service, unregister, deleteByManifest } = buildForDelete({
      kind: 'user',
    })

    await service.deleteUserManifest('mine:one')

    expect(deleteByManifest).toHaveBeenCalledWith('mine:one')
    expect(unregister).toHaveBeenCalledWith('mine:one')
    expect(deleteByManifest.mock.invocationCallOrder[0]).toBeLessThan(
      unregister.mock.invocationCallOrder[0]
    )
  })

  it('refuses a preinstalled manifest', async () => {
    const { service, unregister, deleteByManifest } = buildForDelete({
      kind: 'preinstalled',
    })

    await expect(service.deleteUserManifest('bilibili')).rejects.toThrow(
      /user manifests/
    )
    expect(deleteByManifest).not.toHaveBeenCalled()
    expect(unregister).not.toHaveBeenCalled()
  })

  it('refuses an unknown manifest id', async () => {
    const { service, unregister } = buildForDelete({})

    await expect(service.deleteUserManifest('missing')).rejects.toThrow(
      /user manifests/
    )
    expect(unregister).not.toHaveBeenCalled()
  })
})

describe('ProviderService season resolution by config id', () => {
  const serverA: ProviderConfig = {
    id: 'd9d068cc-d7a5-4277-990b-73b28f7637f8',
    manifestId: 'dandanplay',
    customName: 'Server A',
    enabled: true,
    configValues: { baseUrl: 'https://ddp.selfhosted.example' },
  }
  const serverAAgain: ProviderConfig = {
    ...serverA,
    id: '0f6a3c52-91b4-4c1e-8f0d-2b7e5a9c4d13',
    customName: 'Server A again',
  }
  let db: DanmakuAnywhereDb

  beforeEach(async () => {
    await Dexie.delete(DANMAKU_DB_NAME)
    db = new DanmakuAnywhereDb()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(DANMAKU_DB_NAME)
  })

  function buildWithDb(configs: ProviderConfig[]) {
    const factory = vi.fn((config: ProviderConfig) => ({
      kind: 'source',
      getStatus: available(MANIFEST_CAPABILITIES),
      search: async () => [
        makeSeasonInsert({
          manifestId: config.manifestId,
          providerConfigId: config.id,
          indexedId: 'show-1',
          title: 'Fresh title',
        }),
      ],
    }))
    const mustGet = vi.fn<ProviderConfigService['mustGet']>(async (id) => {
      const config = configs.find((c) => c.id === id)
      if (!config) {
        throw new Error(`missing ${id}`)
      }
      return config
    })
    return buildService({
      seasonService: new SeasonService(db),
      providerConfigService: { getAll: async () => configs, mustGet },
      factory,
    })
  }

  it('surfaces the stored row only for the config that fetched it', async () => {
    const stored = await new SeasonService(db).upsert(
      makeSeasonInsert({
        providerConfigId: serverA.id,
        indexedId: 'show-1',
        title: 'Stored title',
      })
    )
    const service = buildWithDb([serverA, serverAAgain])

    const [fromA] = await service.searchSeason({
      providerConfigId: serverA.id,
      keyword: 'show',
    })
    const [fromAAgain] = await service.searchSeason({
      providerConfigId: serverAAgain.id,
      keyword: 'show',
    })

    expect(fromA).toMatchObject({ id: stored.id, title: 'Stored title' })
    expect(fromAAgain).not.toHaveProperty('id')
    expect(fromAAgain).toMatchObject({ providerConfigId: serverAAgain.id })
  })

  it('throws the source-removed error for a season whose config is gone', async () => {
    const orphan = await new SeasonService(db).upsert(
      makeSeasonInsert({ providerConfigId: serverA.id, indexedId: 'show-1' })
    )
    const service = buildWithDb([serverAAgain])

    await expect(
      service.fetchEpisodesBySeason(orphan.id)
    ).rejects.toMatchObject({ code: 'source.removed' })
  })
})
