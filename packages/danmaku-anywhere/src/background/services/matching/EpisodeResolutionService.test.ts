import { describe, expect, it, vi } from 'vitest'
import type { SourceProvider } from '@/background/services/providers/IDanmakuProvider'
import type { SourceCapabilityService } from '@/background/services/providers/SourceCapabilityService'
import { AppError } from '@/common/errors/AppError'
import type { ProviderConfigService } from '@/common/options/providerConfig/service'
import { makeProviderConfig, makeSeason } from '@/tests/factories'
import { EpisodeResolutionService } from './EpisodeResolutionService'

/**
 * Resolving the episode of a matched season tells "the source has no such
 * episode" apart from "the source could not be asked". The first comes back as
 * a not-found reason; the second keeps its coded error so matching does not
 * report an unreachable source as a missing episode.
 */

const config = makeProviderConfig({ id: 'dandanplay' })
const season = makeSeason({ providerConfigId: 'dandanplay' })

function build(
  provider: Pick<SourceProvider, 'findEpisode'>,
  configs = [config]
) {
  const providerConfigService = {
    getAll: vi.fn(async () => configs),
  } satisfies Pick<ProviderConfigService, 'getAll'>
  const sourceCapabilities = {
    sourceProvider: vi.fn(async () => {
      return provider as SourceProvider // lint-specs-allow-cast: the resolver only calls findEpisode
    }),
  } satisfies Pick<SourceCapabilityService, 'sourceProvider'>
  return new EpisodeResolutionService(
    providerConfigService as unknown as ProviderConfigService, // lint-specs-allow-cast: the resolver only calls getAll
    sourceCapabilities as unknown as SourceCapabilityService // lint-specs-allow-cast: the resolver only calls sourceProvider
  )
}

describe('EpisodeResolutionService.resolveEpisode', () => {
  it('returns a not-found reason when the source has no such episode', async () => {
    const service = build({ findEpisode: vi.fn(async () => null) })

    const result = await service.resolveEpisode(season, 3)

    expect(result).toMatchObject({ success: false })
  })

  it('lets a failure to reach the source through', async () => {
    const failure = new AppError('http', {
      status: 401,
      target: {
        kind: 'source',
        ref: {
          providerConfigId: 'dandanplay',
          manifestId: 'dandanplay',
          name: 'DanDanPlay',
        },
      },
    })
    const service = build({
      findEpisode: vi.fn(async () => {
        throw failure
      }),
    })

    await expect(service.resolveEpisode(season, 3)).rejects.toBe(failure)
  })

  it('reports a season whose source was deleted', async () => {
    const service = build({ findEpisode: vi.fn(async () => null) }, [])

    await expect(service.resolveEpisode(season, 3)).rejects.toMatchObject({
      code: 'source.removed',
    })
  })
})
