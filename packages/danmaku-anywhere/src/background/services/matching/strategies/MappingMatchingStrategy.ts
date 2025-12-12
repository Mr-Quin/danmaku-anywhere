import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import { Logger } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { serializeError } from '@/common/utils/serializeError'
import { EpisodeResolutionService } from '../EpisodeResolutionService'
import type { IMatchingStrategy } from './IMatchingStrategy'

@injectable()
export class MappingMatchingStrategy implements IMatchingStrategy {
  readonly name = 'mapping'
  private logger = Logger.sub('[MappingMatchingStrategy]')

  constructor(
    @inject(TitleMappingService)
    private titleMappingService: TitleMappingService,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(EpisodeResolutionService)
    private episodeResolver: EpisodeResolutionService
  ) {}

  async match(input: MatchEpisodeInput): Promise<MatchEpisodeResult | null> {
    const { mapKey, seasonId, episodeNumber } = input
    const resolution = await this.resolveSeason(mapKey, seasonId)

    if (!resolution) {
      return null
    }

    const { season, providerConfig } = resolution

    // Save mapping if we found it via ID but it wasn't mapped yet
    if (seasonId) {
      await this.titleMappingService.add(SeasonMap.fromSeason(mapKey, season))
    }

    if (episodeNumber === undefined) {
      return {
        status: 'notFound',
        data: null,
        cause: 'Episode number is undefined',
      }
    }

    try {
      const data = await this.episodeResolver.resolveEpisode(
        season,
        episodeNumber
      )
      return {
        status: 'success',
        data,
        metadata: { strategy: 'mapping', providerConfig },
      }
    } catch (e) {
      return { status: 'notFound', data: null, cause: serializeError(e) }
    }
  }

  private async resolveSeason(
    mapKey: string,
    seasonId?: number
  ): Promise<{ season: Season; providerConfig?: ProviderConfig } | undefined> {
    if (seasonId) {
      const season = await this.seasonService.getById(seasonId)
      if (!season) {
        return undefined
      }
      const providerConfig = await this.providerConfigService.get(
        season.providerConfigId
      )
      return { season, providerConfig: providerConfig ?? undefined }
    }

    const mapping = await this.titleMappingService.get(mapKey)

    if (mapping) {
      const autoProviders =
        await this.providerConfigService.getAutomaticProviders()

      // go through all automatic providers and try to find one with a mapped season id
      for (const autoProvider of autoProviders) {
        if (!autoProvider.enabled) {
          continue
        }
        this.logger.debug('Checking provider', autoProvider)
        const mappedId = mapping.getSeasonId(autoProvider.id)
        if (mappedId) {
          this.logger.debug('Found mapped season id', mappedId)
          const season = await this.seasonService.getById(mappedId)
          if (season) {
            return { season, providerConfig: autoProvider }
          }
        }
      }
    }
  }
}
