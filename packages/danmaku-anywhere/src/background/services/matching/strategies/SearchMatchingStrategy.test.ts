import type {
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import { DanmakuProviderFactory } from '@/background/services/providers/ProviderFactory'
import type { MatchEpisodeInput } from '@/common/anime/dto'
import { LoggerSymbol } from '@/common/Logger'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  createTestContainer,
  type TestContainerOverride,
} from '@/tests/createTestContainer'
import { makeProviderConfig, makeSeason } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import { EpisodeResolutionService } from '../EpisodeResolutionService'
import { SearchMatchingStrategy } from './SearchMatchingStrategy'

/**
 * Search is the last resort: it queries the first automatic provider and
 * branches on how many seasons come back. Unlike the strategies before it,
 * an empty result is terminal rather than a pass to the next strategy.
 */

const autoProvider = makeProviderConfig({
  id: 'dandanplay',
  manifestId: 'dandanplay',
})

const episode = {
  id: 5,
  title: 'Episode 1',
} as unknown as WithSeason<EpisodeMeta> // lint-specs-allow-cast: the strategy passes the resolver result through untouched

function makeInput(overrides: Partial<MatchEpisodeInput> = {}) {
  return {
    mapKey: 'Show',
    title: 'Show',
    episodeNumber: 1,
    ...overrides,
  }
}

function buildStrategy(doubles: {
  autoProvider?: ReturnType<typeof makeProviderConfig>
  seasons?: Season[]
  add?: TitleMappingService['add']
  resolveEpisode?: EpisodeResolutionService['resolveEpisode']
}) {
  const {
    autoProvider: provider,
    seasons = [],
    add = vi.fn<TitleMappingService['add']>(async () => undefined),
    resolveEpisode = vi.fn<EpisodeResolutionService['resolveEpisode']>(
      async () => episode
    ),
  } = doubles

  const overrides: TestContainerOverride<unknown>[] = [
    { identifier: LoggerSymbol, value: silentLogger },
    {
      identifier: ProviderConfigService,
      value: {
        getFirstAutomaticProvider: async () => provider,
      } satisfies Pick<ProviderConfigService, 'getFirstAutomaticProvider'>,
    },
    {
      identifier: DanmakuProviderFactory,
      value: () => {
        return { search: async () => seasons }
      },
    },
    {
      identifier: SeasonService,
      value: {
        bulkUpsert: (async () => seasons) as SeasonService['bulkUpsert'],
      } satisfies Pick<SeasonService, 'bulkUpsert'>,
    },
    {
      identifier: TitleMappingService,
      value: { add } satisfies Pick<TitleMappingService, 'add'>,
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
    SearchMatchingStrategy
  )
}

describe('SearchMatchingStrategy', () => {
  it('passes to the next strategy when no automatic provider is enabled', async () => {
    const strategy = buildStrategy({ autoProvider: undefined })

    await expect(strategy.match(makeInput())).resolves.toBeNull()
  })

  it('reports notFound when the search returns nothing', async () => {
    const strategy = buildStrategy({ autoProvider })

    const result = await strategy.match(makeInput())

    expect(result).toEqual({
      status: 'notFound',
      data: null,
      cause: 'No seasons found',
    })
  })

  it('auto-maps and resolves when the search returns exactly one season', async () => {
    const found = makeSeason({ id: 42, namespaceKey: 'dandanplay' })
    const add = vi.fn<TitleMappingService['add']>(async () => undefined)
    const strategy = buildStrategy({
      autoProvider,
      seasons: [found],
      add,
    })

    const result = await strategy.match(makeInput())

    const [saved] = add.mock.calls[0]
    expect(saved.getSeasonId('dandanplay')).toBe(42)
    expect(result).toEqual({
      status: 'success',
      data: episode,
      metadata: { strategy: 'search', providerConfig: autoProvider },
    })
  })

  it('reports notFound without resolving when the episode number is unknown', async () => {
    const found = makeSeason({ id: 42, namespaceKey: 'dandanplay' })
    const resolveEpisode = vi.fn<EpisodeResolutionService['resolveEpisode']>(
      async () => episode
    )
    const strategy = buildStrategy({
      autoProvider,
      seasons: [found],
      resolveEpisode,
    })

    const result = await strategy.match(makeInput({ episodeNumber: undefined }))

    expect(result).toEqual({
      status: 'notFound',
      data: null,
      cause: 'Episode number is undefined',
    })
    expect(resolveEpisode).not.toHaveBeenCalled()
  })

  it('turns a resolver failure into notFound carrying the cause', async () => {
    const found = makeSeason({ id: 42, namespaceKey: 'dandanplay' })
    const strategy = buildStrategy({
      autoProvider,
      seasons: [found],
      resolveEpisode: vi.fn(async () => {
        throw new Error('Episode 1 not found in season')
      }),
    })

    const result = await strategy.match(makeInput())

    expect(result).toEqual({
      status: 'notFound',
      data: null,
      cause: 'Episode 1 not found in season',
    })
  })

  it('hands back every found season for disambiguation when several match', async () => {
    const found = [
      makeSeason({ id: 1, title: 'Show season 1' }),
      makeSeason({ id: 2, title: 'Show season 2' }),
    ]
    const strategy = buildStrategy({
      autoProvider,
      seasons: found,
    })

    const result = await strategy.match(makeInput())

    expect(result).toEqual({
      status: 'disambiguation',
      data: found,
      metadata: { strategy: 'search', providerConfig: autoProvider },
    })
  })
})
