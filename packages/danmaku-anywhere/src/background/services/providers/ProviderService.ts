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
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { OmitSeasonId } from './IDanmakuProvider'
import { ManifestRegistry } from './ManifestRegistry'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'

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
  private readonly logger: ILogger

  constructor(
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory,
    @inject(ManifestRegistry)
    private manifestRegistry: ManifestRegistry,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = logger.sub('[ProviderService]')
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
    if (!service.getSeason) {
      return
    }
    const seasonInsert = await service.getSeason(season.providerIds)
    if (seasonInsert) {
      await this.seasonService.upsert(seasonInsert)
    } else {
      throw new Error(`Season refresh failed: ${season.title}`, {
        cause: season,
      })
    }
  }

  async preloadNextEpisode(request: DanmakuFetchRequest): Promise<void> {
    const resolved = await this.resolveMeta(request)
    const config = await this.providerConfigService.mustGet(
      resolved.meta.season.providerConfigId
    )

    const service = this.danmakuProviderFactory(config)

    if (service.preloadNextEpisode) {
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

    const { meta } = resolved
    const [existingDanmaku] = await this.danmakuService.filter({
      provider,
      indexedId: meta.indexedId,
      seasonId: meta.seasonId,
    })

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
    const configs = await this.providerConfigService.getAll()
    for (const config of configs) {
      if (!config.enabled) {
        continue
      }
      const service = this.danmakuProviderFactory(config)
      if (!service.canParse?.(url)) {
        continue
      }
      if (!service.parseUrl) {
        continue
      }
      const result = await service.parseUrl(url)
      if (result) {
        const { episodeMeta, seasonInsert } = result
        const season = await this.seasonService.upsert(seasonInsert)
        return enrichEpisode(episodeMeta, season)
      }
    }

    throw new Error('No provider found capable of parsing URL')
  }

  async probeLogin<T = unknown>(manifestId: string): Promise<T | null> {
    return this.manifestRegistry.getRunner(manifestId).runLoginProbe<T>()
  }

  async setCookies(manifestId: string): Promise<void> {
    const { cookieSet } = this.manifestRegistry.getRunner(manifestId).manifest
    if (!cookieSet) {
      throw new Error(`manifest "${manifestId}" has no cookieSet declaration`)
    }
    // `credentials: 'include'` so the browser actually processes Set-Cookie
    // from the cross-origin response. Without it Chrome drops cookies from
    // extension-initiated requests even when the cookieReplay listener has
    // captured the header for the engine's view.
    await fetch(cookieSet.url, { credentials: 'include' })
  }
}
