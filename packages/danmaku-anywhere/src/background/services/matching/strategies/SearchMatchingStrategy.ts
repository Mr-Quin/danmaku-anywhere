import {
  DanmakuSourceType,
  type Season,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { Logger } from '@/background/backgroundLogger'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import { isNotCustom, isProvider } from '@/common/danmaku/utils'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { serializeError } from '@/common/utils/serializeError'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from '../../providers/ProviderFactory'
import { EpisodeResolutionService } from '../EpisodeResolutionService'
import type { IMatchingStrategy } from './IMatchingStrategy'

@injectable()
export class SearchMatchingStrategy implements IMatchingStrategy {
  readonly name = 'search'

  private logger = Logger.sub('SearchStrategy')

  constructor(
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(TitleMappingService)
    private titleMappingService: TitleMappingService,
    @inject(EpisodeResolutionService)
    private episodeResolver: EpisodeResolutionService
  ) {}

  async match(input: MatchEpisodeInput): Promise<MatchEpisodeResult | null> {
    const { title, mapKey, episodeNumber } = input

    const autoProvider =
      await this.providerConfigService.getFirstAutomaticProvider()

    if (!autoProvider) {
      return null
    }

    const service = this.danmakuProviderFactory(autoProvider)

    this.logger.debug(`Searching for season: ${title}`)
    const foundSeasonInserts = (await service.search({
      keyword: title,
    })) as SeasonInsert[] // TODO: technically unsafe, fix by folding custom season into season

    if (
      foundSeasonInserts[0] &&
      isProvider(foundSeasonInserts[0], DanmakuSourceType.MacCMS)
    ) {
      // should not be reached
      throw new Error('Custom season found, but not supported')
    }

    const foundSeasons = await this.seasonService.bulkUpsert(foundSeasonInserts)

    if (foundSeasons.length === 0) {
      return { status: 'notFound', data: null, cause: 'No seasons found' }
    }

    if (foundSeasons.length === 1) {
      const firstSeason = foundSeasons[0] as Season
      this.logger.debug('Single season found, auto-mapping', firstSeason)

      await this.titleMappingService.add(
        SeasonMap.fromSeason(mapKey, firstSeason)
      )

      if (episodeNumber === undefined) {
        return {
          status: 'notFound',
          data: null,
          cause: 'Episode number is undefined',
        }
      }

      try {
        const data = await this.episodeResolver.resolveEpisode(
          firstSeason,
          episodeNumber
        )
        return {
          status: 'success',
          data,
          metadata: { strategy: 'search', providerConfig: autoProvider },
        }
      } catch (e) {
        return { status: 'notFound', data: null, cause: serializeError(e) }
      }
    }

    return {
      status: 'disambiguation',
      data: foundSeasons.filter(isNotCustom),
      metadata: { strategy: 'search', providerConfig: autoProvider },
    }
  }
}
