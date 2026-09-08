import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import { ManifestRegistry } from '@/background/services/providers/ManifestRegistry'
import type { MatchEpisodeInput } from '@/common/anime/dto'
import { LoggerSymbol } from '@/common/Logger'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import {
  createTestContainer,
  type TestContainerOverride,
} from '@/tests/createTestContainer'
import { makeProviderConfig, makeSeason } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import { EpisodeResolutionService } from '../EpisodeResolutionService'
import { MappingMatchingStrategy } from './MappingMatchingStrategy'

/**
 * Mapping resolves a season either from an explicit seasonId or by walking the
 * automatic providers for one the stored mapping already points at. Resolving
 * by id also writes the mapping back, and a resolver failure has to surface as
 * a notFound result carrying the cause rather than as a thrown error.
 */

const season = makeSeason({
  id: 42,
  manifestId: 'dandanplay',
  namespaceKey: 'dandanplay',
})

const episode = {
  id: 5,
  title: 'Episode 1',
  season,
} as unknown as WithSeason<EpisodeMeta> // lint-specs-allow-cast: the strategy passes the resolver result through untouched

const autoProvider = makeProviderConfig({
  id: 'dandanplay',
  manifestId: 'dandanplay',
})

function makeInput(overrides: Partial<MatchEpisodeInput> = {}) {
  return {
    mapKey: 'Show',
    title: 'Show',
    episodeNumber: 1,
    ...overrides,
  }
}

function buildStrategy(doubles: {
  getById?: SeasonService['getById']
  mapping?: SeasonMap
  add?: TitleMappingService['add']
  automaticProviders?: ReturnType<typeof makeProviderConfig>[]
  resolveEpisode?: EpisodeResolutionService['resolveEpisode']
}) {
  const {
    getById = vi.fn<SeasonService['getById']>(async () => undefined),
    mapping,
    add = vi.fn<TitleMappingService['add']>(async () => undefined),
    automaticProviders = [],
    resolveEpisode = vi.fn<EpisodeResolutionService['resolveEpisode']>(
      async () => episode
    ),
  } = doubles

  const overrides: TestContainerOverride<unknown>[] = [
    { identifier: LoggerSymbol, value: silentLogger },
    {
      identifier: SeasonService,
      value: { getById } satisfies Pick<SeasonService, 'getById'>,
    },
    {
      identifier: TitleMappingService,
      value: {
        add,
        get: vi.fn<TitleMappingService['get']>(async () => mapping),
      } satisfies Pick<TitleMappingService, 'add' | 'get'>,
    },
    {
      identifier: ProviderConfigService,
      value: {
        getAll: async () => automaticProviders,
        getAutomaticProviders: async () => automaticProviders,
      } satisfies Pick<
        ProviderConfigService,
        'getAll' | 'getAutomaticProviders'
      >,
    },
    {
      identifier: ManifestRegistry,
      value: {
        getIdentityFieldsMap: async () => {
          return {}
        },
      } satisfies Pick<ManifestRegistry, 'getIdentityFieldsMap'>,
    },
    {
      identifier: EpisodeResolutionService,
      value: { resolveEpisode } satisfies Pick<
        EpisodeResolutionService,
        'resolveEpisode'
      >,
    },
  ]

  return createTestContainer([backgroundContainerModule], overrides).get(
    MappingMatchingStrategy
  )
}

describe('MappingMatchingStrategy', () => {
  it('resolves an episode from an explicit season id', async () => {
    const strategy = buildStrategy({ getById: vi.fn(async () => season) })

    const result = await strategy.match(makeInput({ seasonId: season.id }))

    expect(result).toEqual({
      status: 'success',
      data: episode,
      metadata: { strategy: 'mapping', providerConfig: undefined },
    })
  })

  it('writes the mapping back after resolving by season id', async () => {
    const add = vi.fn<TitleMappingService['add']>(async () => undefined)
    const strategy = buildStrategy({ getById: vi.fn(async () => season), add })

    await strategy.match(makeInput({ seasonId: season.id }))

    const [saved] = add.mock.calls[0]
    expect(saved.key).toBe('Show')
    expect(saved.getSeasonId('dandanplay')).toBe(season.id)
  })

  it('passes to the next strategy when the explicit season id is unknown', async () => {
    const strategy = buildStrategy({ getById: vi.fn(async () => undefined) })

    await expect(
      strategy.match(makeInput({ seasonId: 999 }))
    ).resolves.toBeNull()
  })

  it('resolves through the stored mapping for an automatic provider', async () => {
    const strategy = buildStrategy({
      mapping: SeasonMap.fromSnapshot({
        key: 'Show',
        seasons: { dandanplay: season.id },
        seasonIds: [season.id],
      }),
      automaticProviders: [autoProvider],
      getById: vi.fn(async () => season),
    })

    const result = await strategy.match(makeInput())

    expect(result).toEqual({
      status: 'success',
      data: episode,
      metadata: { strategy: 'mapping', providerConfig: autoProvider },
    })
  })

  it('passes to the next strategy when the mapping names no known provider', async () => {
    const strategy = buildStrategy({
      mapping: SeasonMap.fromSnapshot({
        key: 'Show',
        seasons: { bilibili: 7 },
        seasonIds: [7],
      }),
      automaticProviders: [autoProvider],
    })

    await expect(strategy.match(makeInput())).resolves.toBeNull()
  })

  it('passes to the next strategy when nothing is mapped', async () => {
    const strategy = buildStrategy({})

    await expect(strategy.match(makeInput())).resolves.toBeNull()
  })

  it('reports notFound without resolving when the episode number is unknown', async () => {
    const resolveEpisode = vi.fn<EpisodeResolutionService['resolveEpisode']>(
      async () => episode
    )
    const strategy = buildStrategy({
      getById: vi.fn(async () => season),
      resolveEpisode,
    })

    const result = await strategy.match(
      makeInput({ seasonId: season.id, episodeNumber: undefined })
    )

    expect(result).toEqual({
      status: 'notFound',
      data: null,
      cause: 'Episode number is undefined',
    })
    expect(resolveEpisode).not.toHaveBeenCalled()
  })

  it('turns a resolver failure into notFound carrying the cause', async () => {
    const strategy = buildStrategy({
      getById: vi.fn(async () => season),
      resolveEpisode: vi.fn(async () => {
        throw new Error('Episode 1 not found in season')
      }),
    })

    const result = await strategy.match(makeInput({ seasonId: season.id }))

    expect(result).toEqual({
      status: 'notFound',
      data: null,
      cause: 'Episode 1 not found in season',
    })
  })
})
