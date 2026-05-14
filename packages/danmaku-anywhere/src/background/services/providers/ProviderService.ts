import type {
  CustomSeason,
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import type { SeasonQueryFilter, SeasonSearchRequest } from '@/common/anime/dto'
import type {
  DanmakuFetchByMeta,
  DanmakuFetchRequest,
} from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { isProvider } from '@/common/danmaku/utils'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import { BilibiliService } from './bilibili/BilibiliService'
import type { IDanmakuProvider, OmitSeasonId } from './IDanmakuProvider'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'
import { TencentService } from './tencent/TencentService'

function enrichEpisode(
  episode: OmitSeasonId<EpisodeMeta>,
  season: Season
): WithSeason<EpisodeMeta> {
  return {
    ...episode,
    seasonId: season.id,
    season,
  }
}

@injectable('Singleton')
export class ProviderService {
  private logger: ILogger
  private parsers: IDanmakuProvider[] = []

  constructor(
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory,
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = logger.sub('[ProviderService]')
  }

  // URL detection still goes through per-source services because the
  // manifest engine doesn't have a parseUrl pipeline kind yet (Phase 2).
  // Constructed directly here rather than through the factory, which
  // returns ManifestProviderService for the main fetch path.
  private async initParsers() {
    try {
      const bilibiliConfig =
        await this.providerConfigService.getBuiltInBilibili()
      const tencentConfig = await this.providerConfigService.getBuiltInTencent()

      this.parsers = [
        new BilibiliService(
          bilibiliConfig,
          this.logger,
          this.extensionOptionsService
        ),
        new TencentService(
          tencentConfig,
          this.logger,
          this.extensionOptionsService
        ),
      ]
    } catch (e) {
      this.logger.error('Failed to init parsers', e)
    }
  }

  async searchSeason(
    params: SeasonSearchRequest
  ): Promise<(Season | SeasonInsert)[] | CustomSeason[]> {
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
    // Surface existing ids so bookmark / cache indicators still resolve.
    const inserts = seasonInserts as SeasonInsert[]
    return Promise.all(
      inserts.map(async (insert) => {
        const existing = await this.seasonService.findExisting(insert)
        return existing ?? insert
      })
    )
  }

  async upsertSeason(data: SeasonInsert): Promise<Season> {
    return this.seasonService.upsert(data)
  }

  async fetchEpisodesBySeason(
    seasonId: number
  ): Promise<WithSeason<EpisodeMeta>[]> {
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )
    const service = this.danmakuProviderFactory(providerConfig)

    if (service.forProvider === DanmakuSourceType.MacCMS) {
      throw new Error('MacCMS does not support fetching episodes')
    }

    const episodes = await service.getEpisodes(season.providerIds)
    return episodes.map((episode) => enrichEpisode(episode, season))
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
    const resolved = await this.resolveMeta(request)
    const config = await this.providerConfigService.mustGet(
      resolved.meta.season.providerConfigId
    )

    const service = this.danmakuProviderFactory(config)

    if (service?.preloadNextEpisode) {
      return service.preloadNextEpisode(resolved)
    }

    this.logger.warn(
      `Preloading next episode is not supported for provider: ${config.impl}`
    )
  }

  private async resolveMeta(
    request: DanmakuFetchRequest
  ): Promise<DanmakuFetchByMeta> {
    if (request.type === 'by-meta') {
      return request
    }
    const season = await this.seasonService.mustGetById(request.seasonId)
    const meta = enrichEpisode(
      {
        ...request.stub,
        schemaVersion: 4 as const,
        lastChecked: 0,
      },
      season
    )
    return { type: 'by-meta', meta, options: request.options }
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<WithSeason<Episode>> {
    const resolved = await this.resolveMeta(request)
    const { options = {} } = resolved
    const provider = resolved.meta.provider

    if (provider === DanmakuSourceType.MacCMS) {
      throw new Error('MacCMS episodes are not refetchable')
    }

    let existingDanmaku: WithSeason<Episode> | undefined

    const { meta } = resolved
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

    const config = await this.providerConfigService.mustGet(
      meta.season.providerConfigId
    )
    const service = this.danmakuProviderFactory(config)

    const comments = await service.getDanmaku(resolved)

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
    }
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

          return enrichEpisode(episodeMeta, season)
        }
      }
    }

    throw new Error('No provider found capable of parsing URL')
  }
}
