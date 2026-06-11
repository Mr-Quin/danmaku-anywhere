import type {
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from '../providers/ProviderFactory'
import { resolveSeasonConfig } from '../providers/resolveSeasonConfig'

@injectable('Singleton')
export class EpisodeResolutionService {
  constructor(
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory
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
    const service = this.danmakuProviderFactory(providerConfig)

    if (!service.findEpisode) {
      throw new Error(
        `Provider ${season.provider} does not support episode matching.`
      )
    }

    const match = await service.findEpisode(season, episodeNumber)
    if (match) return match

    throw new Error(
      `Episode ${episodeNumber} not found in season: ${season.title}`
    )
  }
}
