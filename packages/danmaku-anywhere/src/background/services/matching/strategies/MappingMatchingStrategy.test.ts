import { err } from '@danmaku-anywhere/result'
import { describe, expect, it, vi } from 'vitest'
import type { SeasonService } from '@/background/services/persistence/SeasonService'
import type { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import type { SourceCapabilityService } from '@/background/services/providers/SourceCapabilityService'
import { AppError } from '@/common/errors/AppError'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import { makeProviderConfig, makeSeason } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import type { EpisodeResolutionService } from '../EpisodeResolutionService'
import { MappingMatchingStrategy } from './MappingMatchingStrategy'

/**
 * A mapped season whose source fails while resolving the episode reports that
 * failure, so the toast names the source and its problem. Only a source that
 * answered without the episode is reported as not found.
 */

const config = makeProviderConfig({ id: 'dandanplay' })
const season = makeSeason({ id: 7, providerConfigId: 'dandanplay' })

function build(
  resolveEpisode: EpisodeResolutionService['resolveEpisode']
): MappingMatchingStrategy {
  const titleMappingService = {
    add: vi.fn(async () => undefined),
  } satisfies Pick<TitleMappingService, 'add'>
  const seasonService = {
    getById: vi.fn(async () => season),
  } satisfies Pick<SeasonService, 'getById'>
  const providerConfigService = {
    getAll: vi.fn(async () => [config]),
  } satisfies Pick<ProviderConfigService, 'getAll'>
  return new MappingMatchingStrategy(
    titleMappingService as unknown as TitleMappingService, // lint-specs-allow-cast: the strategy only calls add
    seasonService as unknown as SeasonService, // lint-specs-allow-cast: the strategy only calls getById
    providerConfigService as unknown as ProviderConfigService, // lint-specs-allow-cast: the strategy only calls getAll
    { resolveEpisode } as unknown as EpisodeResolutionService, // lint-specs-allow-cast: the strategy only calls resolveEpisode
    {} as SourceCapabilityService, // lint-specs-allow-cast: unused when the season id is given
    silentLogger
  )
}

const input = {
  mapKey: 'Frieren',
  title: 'Frieren',
  seasonId: 7,
  episodeNumber: 3,
}

describe('MappingMatchingStrategy.match', () => {
  it('lets a source failure through instead of reporting not found', async () => {
    const failure = new AppError('http', {
      status: 500,
      target: {
        kind: 'source',
        ref: {
          providerConfigId: 'dandanplay',
          manifestId: 'dandanplay',
          name: 'DanDanPlay',
        },
      },
    })
    const strategy = build(
      vi.fn(async () => {
        throw failure
      })
    )

    await expect(strategy.match(input)).rejects.toBe(failure)
  })

  it('reports not found when the source has no such episode', async () => {
    const strategy = build(vi.fn(async () => err('Episode 3 not found')))

    expect(await strategy.match(input)).toEqual({
      status: 'notFound',
      data: null,
      cause: 'Episode 3 not found',
    })
  })
})
