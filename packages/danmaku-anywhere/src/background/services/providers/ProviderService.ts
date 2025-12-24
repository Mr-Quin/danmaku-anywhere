import type {
  ByProvider,
  CustomSeason,
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { Logger } from '@/background/backgroundLogger'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import type { SeasonQueryFilter, SeasonSearchRequest } from '@/common/anime/dto'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType, isProvider } from '@/common/danmaku/utils'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { IDanmakuProvider, OmitSeasonId } from './IDanmakuProvider'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'

const enrichEpisode = <T extends DanmakuSourceType>(
  episode: OmitSeasonId<ByProvider<EpisodeMeta, T>>,
  season: ByProvider<Season, T>
) => {
  return {
    ...episode,
    seasonId: season.id,
    season: season,
  }
}

@injectable('Singleton')
export class ProviderService {
  private logger: typeof Logger
  private parsers: IDanmakuProvider[] = []

  constructor(
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory
  ) {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[ProviderService]')
  }

  private async initParsers() {
    try {
      const bilibiliConfig =
        await this.providerConfigService.getBuiltInBilibili()
      const tencentConfig = await this.providerConfigService.getBuiltInTencent()

      this.parsers = [
        this.danmakuProviderFactory(bilibiliConfig),
        this.danmakuProviderFactory(tencentConfig),
      ]
    } catch (e) {
      this.logger.error('Failed to init parsers', e)
    }
  }

  async searchSeason(
    params: SeasonSearchRequest
  ): Promise<Season[] | CustomSeason[]> {
    const providerConfig = await this.providerConfigService.mustGet(
      params.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)

    const seasonInserts = await service.search(params)
    // TODO: fix this once we fold custom seasons into the season insert
    if (
      seasonInserts[0] &&
      isProvider(seasonInserts[0], DanmakuSourceType.MacCMS)
    ) {
      return seasonInserts as CustomSeason[]
    }
    return this.seasonService.bulkUpsert(seasonInserts as SeasonInsert[])
  }

  async fetchEpisodesBySeason(
    seasonId: number
  ): Promise<WithSeason<EpisodeMeta>[]> {
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )
    const service = this.danmakuProviderFactory.getTyped(providerConfig)

    const enrichEpisodes = <T extends DanmakuSourceType>(
      episodes: OmitSeasonId<ByProvider<EpisodeMeta, T>>[],
      season: ByProvider<Season, T>
    ) => {
      return episodes.map((episode) => enrichEpisode(episode, season))
    }

    switch (service.forProvider) {
      case DanmakuSourceType.DanDanPlay: {
        assertProviderType(season, DanmakuSourceType.DanDanPlay)
        const episodes = await service.getEpisodes(season.providerIds)
        return enrichEpisodes(episodes, season)
      }
      case DanmakuSourceType.Bilibili: {
        assertProviderType(season, DanmakuSourceType.Bilibili)
        const episodes = await service.getEpisodes(season.providerIds)
        return enrichEpisodes(episodes, season)
      }
      case DanmakuSourceType.Tencent: {
        assertProviderType(season, DanmakuSourceType.Tencent)
        const episodes = await service.getEpisodes(season.providerIds)
        return enrichEpisodes(episodes, season)
      }
      case DanmakuSourceType.MacCMS: {
        throw new Error('MacCMS does not support fetching episodes')
      }
    }
  }

  async refreshSeason(filter: SeasonQueryFilter) {
    const [season] = await this.seasonService.filter(filter)

    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)
    if (service?.getSeason) {
      const seasonInsert = await service.getSeason(season.providerIds)
      if (seasonInsert) {
        await this.seasonService.upsert(seasonInsert)
      } else {
        throw new Error(`Season refresh failed: ${season.title}`, {
          cause: season,
        })
      }
    }
  }

  async preloadNextEpisode(request: DanmakuFetchRequest): Promise<void> {
    const config = await this.resolveConfig(request)

    const service = this.danmakuProviderFactory(config)

    if (service?.preloadNextEpisode) {
      return service.preloadNextEpisode(request)
    }

    this.logger.warn(
      `Preloading next episode is not supported for provider: ${config.impl}`
    )
  }

  private async resolveConfig(
    request: DanmakuFetchRequest
  ): Promise<ProviderConfig> {
    return this.providerConfigService.mustGet(
      request.meta.season.providerConfigId
    )
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<WithSeason<Episode>> {
    const { options = {} } = request
    const provider = request.meta.provider

    let existingDanmaku: WithSeason<Episode> | undefined

    const { meta } = request
    const [found] = await this.danmakuService.filter({
      provider,
      indexedId: meta.indexedId,
      seasonId: meta.seasonId,
    })
    existingDanmaku = found

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      return existingDanmaku
    }

    if (options.forceUpdate) {
      this.logger.debug('Force update flag set, bypassed cache')
    } else {
      this.logger.debug('Danmaku not found in db, fetching from server')
    }

    const config = await this.resolveConfig(request)
    const service = this.danmakuProviderFactory(config)

    const comments = await service.getDanmaku(request)

    const { season, ...rest } = meta

    const saved = await this.danmakuService.upsert({
      ...rest,
      seasonId: season.id,
      comments,
      commentCount: comments.length,
    })

    return {
      ...saved,
      season,
    } as WithSeason<Episode>
  }

  async parseUrl(url: string): Promise<WithSeason<EpisodeMeta>> {
    if (this.parsers.length === 0) {
      await this.initParsers()
    }

    for (const provider of this.parsers) {
      if (provider.parseUrl && provider.canParse?.(url)) {
        const result = await provider.parseUrl(url)
        if (result) {
          const { episodeMeta, seasonInsert } = result
          const season = await this.seasonService.upsert(seasonInsert)

          return enrichEpisode(episodeMeta, season) as WithSeason<EpisodeMeta>
        }
      }
    }

    throw new Error('No provider found capable of parsing URL')
  }
}
