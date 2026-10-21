import type {
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { resolveSeasonConfig } from '@/common/providers/resolveSeasonConfig'
import { SourceCapabilityService } from '../providers/SourceCapabilityService'

@injectable('Singleton')
export class EpisodeResolutionService {
  constructor(
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(SourceCapabilityService)
    private sourceCapabilities: SourceCapabilityService
  ) {}

  async resolveEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta>> {
    const providerConfig = resolveSeasonConfig(
      season,
      await this.providerConfigService.getAll()
    )
    if (!providerConfig) {
      throw new Error(`Provider config not found for season: ${season.title}`)
    }
    const service = await this.sourceCapabilities.sourceProvider(
      providerConfig,
      'episodes'
    )

    const match = await service.findEpisode(season, episodeNumber)
    if (match) return match

    throw new Error(
      `Episode ${episodeNumber} not found in season: ${season.title}`
    )
  }
}
