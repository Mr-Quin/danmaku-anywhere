import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import type { MatchEpisodeResult } from '@/common/anime/dto'
import { LoggerSymbol } from '@/common/Logger'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { ProviderService } from '../providers/ProviderService'
import { EpisodeMatchingService } from './EpisodeMatchingService'
import { LocalMatchingStrategy } from './strategies/LocalMatchingStrategy'
import { MappingMatchingStrategy } from './strategies/MappingMatchingStrategy'
import { SearchMatchingStrategy } from './strategies/SearchMatchingStrategy'

const NOT_FOUND: MatchEpisodeResult = {
  status: 'notFound',
  data: null,
  cause: 'nothing',
}

describe('EpisodeMatchingService', () => {
  it('waits for the season identity reconcile before any strategy runs', async () => {
    const { promise: reconciled, resolve } = Promise.withResolvers<void>()
    const seasonsReady = vi.fn<ProviderService['seasonsReady']>(
      () => reconciled
    )
    const localMatch = vi.fn<LocalMatchingStrategy['match']>(async () => null)
    const mappingMatch = vi.fn<MappingMatchingStrategy['match']>(
      async () => null
    )
    const searchMatch = vi.fn<SearchMatchingStrategy['match']>(
      async () => NOT_FOUND
    )
    const service = createTestContainer(
      [backgroundContainerModule],
      [
        { identifier: ProviderService, value: { seasonsReady } },
        {
          identifier: LocalMatchingStrategy,
          value: { name: 'local', match: localMatch },
        },
        {
          identifier: MappingMatchingStrategy,
          value: { name: 'mapping', match: mappingMatch },
        },
        {
          identifier: SearchMatchingStrategy,
          value: { name: 'search', match: searchMatch },
        },
        { identifier: LoggerSymbol, value: silentLogger },
      ]
    ).get(EpisodeMatchingService)

    const result = service.findMatchingEpisodes({ mapKey: 'k', title: 'Show' })
    await vi.waitFor(() => expect(seasonsReady).toHaveBeenCalled())
    expect(localMatch).not.toHaveBeenCalled()

    resolve()

    await expect(result).resolves.toEqual(NOT_FOUND)
    expect(localMatch).toHaveBeenCalled()
  })
})
