import { inject, injectable } from 'inversify'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IMatchingStrategy } from './strategies/IMatchingStrategy'
import { LocalMatchingStrategy } from './strategies/LocalMatchingStrategy'
import { MappingMatchingStrategy } from './strategies/MappingMatchingStrategy'
import { SearchMatchingStrategy } from './strategies/SearchMatchingStrategy'

@injectable('Singleton')
export class EpisodeMatchingService {
  private logger: ILogger
  private strategies: IMatchingStrategy[]

  constructor(
    @inject(LocalMatchingStrategy) localStrategy: LocalMatchingStrategy,
    @inject(MappingMatchingStrategy) mappingStrategy: MappingMatchingStrategy,
    @inject(SearchMatchingStrategy) searchStrategy: SearchMatchingStrategy,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.strategies = [localStrategy, mappingStrategy, searchStrategy]
    this.logger = logger.sub('EpisodeMatchingService')
  }

  async findMatchingEpisodes(
    input: MatchEpisodeInput
  ): Promise<MatchEpisodeResult> {
    for (const strategy of this.strategies) {
      this.logger.debug(`Matching using strategy ${strategy.name}`, input)
      const result = await strategy.match(input)

      if (result) {
        this.logger.debug(
          `Strategy ${strategy.name} returned result`,
          result.status
        )
        return result
      }
    }

    return {
      status: 'notFound',
      data: null,
      cause: 'All strategies returned null',
    }
  }
}
