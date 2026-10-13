import type {
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { err, ok, type Result } from '@danmaku-anywhere/result'
import { inject, injectable } from 'inversify'
import { AppError } from '@/common/errors/AppError'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { resolveSeasonConfig } from '@/common/providers/resolveSeasonConfig'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from '../providers/ProviderFactory'

@injectable('Singleton')
export class EpisodeResolutionService {
  constructor(
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory
  ) {}

  // Not finding the episode is an expected outcome and comes back as the
  // reason; a source that cannot be reached throws its coded error.
  async resolveEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<Result<WithSeason<EpisodeMeta>, string>> {
    const providerConfig = resolveSeasonConfig(
      season,
      await this.providerConfigService.getAll()
    )
    if (!providerConfig) {
      throw new AppError(
        'source.removed',
        {},
        { message: `Provider config not found for season: ${season.title}` }
      )
    }
    const service = this.danmakuProviderFactory(providerConfig)

    if (!service.findEpisode) {
      return err(
        `Provider ${season.manifestId} does not support episode matching.`
      )
    }

    const match = await service.findEpisode(season, episodeNumber)
    if (!match) {
      return err(
        `Episode ${episodeNumber} not found in season: ${season.title}`
      )
    }
    return ok(match)
  }
}
