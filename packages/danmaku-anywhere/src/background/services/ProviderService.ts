import type {
  CustomSeason,
  DanDanPlayOf,
  Episode,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuService } from '@/background/services/DanmakuService'
import type { MacCmsProviderService } from '@/background/services/MacCmsProviderService'
import type { BilibiliService } from '@/background/services/providers/bilibili/BilibiliService'
import type { DanDanPlayService } from '@/background/services/providers/dandanplay/DanDanPlayService'
import type { TencentService } from '@/background/services/providers/tencent/TencentService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { TitleMappingService } from '@/background/services/TitleMappingService'
import type {
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonQueryFilter,
  SeasonSearchParams,
} from '@/common/anime/dto'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { stripExtension } from '@/common/utils/stripExtension'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import { ProviderRegistry } from './providers/ProviderRegistry'

export class ProviderService {
  private logger: typeof Logger

  constructor(
    private titleMappingService: TitleMappingService,
    private danmakuService: DanmakuService,
    private seasonService: SeasonService,
    private danDanPlayService: DanDanPlayService,
    private bilibiliService: BilibiliService,
    private tencentService: TencentService,
    private customProviderService: MacCmsProviderService,
    private providerRegistry: ProviderRegistry = new ProviderRegistry()
  ) {
    this.providerRegistry.register(
      DanmakuSourceType.DanDanPlay,
      this.danDanPlayService
    )
    this.providerRegistry.register(
      DanmakuSourceType.Bilibili,
      this.bilibiliService
    )
    this.providerRegistry.register(
      DanmakuSourceType.Tencent,
      this.tencentService
    )
    this.providerRegistry.register(
      DanmakuSourceType.MacCMS,
      this.customProviderService
    )
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[ProviderService]')
  }

  async searchSeason(
    params: SeasonSearchParams
  ): Promise<Season[] | CustomSeason[]> {
    const providerConfig = await providerConfigService.mustGet(
      params.providerConfigId
    )

    const service = this.providerRegistry.mustGet(providerConfig.impl)

    return service.search(params, providerConfig)
  }

  async fetchEpisodesBySeason(seasonId: number) {
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await providerConfigService.mustGet(
      season.providerConfigId
    )

    const service = this.providerRegistry.mustGet(season.provider)

    return service.getEpisodes(seasonId, providerConfig)
  }

  async refreshSeason(filter: SeasonQueryFilter) {
    const [season] = await this.seasonService.filter(filter)

    const providerConfig = await providerConfigService.mustGet(
      season.providerConfigId
    )

    const service = this.providerRegistry.get(season.provider)
    if (service?.refreshSeason) {
      await service.refreshSeason(season, providerConfig)
    }
  }

  async preloadNextEpisode(request: DanmakuFetchRequest): Promise<void> {
    const config = await this.resolveConfig(request)
    const providerType =
      request.type === 'by-id' ? request.provider : request.meta.provider

    const service = this.providerRegistry.get(providerType)

    if (service?.preloadNextEpisode) {
      return service.preloadNextEpisode(request, config)
    }

    this.logger.warn(
      `Preloading next episode is not supported for provider: ${providerType}`
    )
  }

  private async resolveConfig(
    request: DanmakuFetchRequest
  ): Promise<ProviderConfig> {
    if (request.type === 'by-id') {
      const season = await this.seasonService.mustGetById(request.seasonId)
      return providerConfigService.mustGet(season.providerConfigId)
    }
    return providerConfigService.mustGet(request.meta.season.providerConfigId)
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<WithSeason<Episode>> {
    const { options = {} } = request
    const provider =
      request.type === 'by-id' ? request.provider : request.meta.provider

    let existingDanmaku: WithSeason<Episode> | undefined

    if (request.type === 'by-id') {
      const [found] = await this.danmakuService.filter({
        provider,
        seasonId: request.seasonId,
        ids: [request.episodeId],
      })
      existingDanmaku = found
    } else {
      const { meta } = request
      const [found] = await this.danmakuService.filter({
        provider,
        indexedId: meta.indexedId,
        seasonId: meta.seasonId,
      })
      existingDanmaku = found
    }

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
    const service = this.providerRegistry.mustGet(provider)

    return service.getDanmaku(request, config)
  }

  async findMatchingEpisodes({
    mapKey,
    title,
    episodeNumber = 1,
    seasonId,
  }: MatchEpisodeInput): Promise<MatchEpisodeResult> {
    const findEpisodeInSeason = async (
      season: Season
    ): Promise<WithSeason<EpisodeMeta>> => {
      const service = this.providerRegistry.mustGet(season.provider)

      if (service.findEpisode) {
        const match = await service.findEpisode(season, episodeNumber)
        if (match) return match
        throw new Error(
          `Episode ${episodeNumber} not found in season: ${season.title}`
        )
      }

      throw new Error(
        `Provider ${season.provider} does not support episode matching.`
      )
    }

    if ((await extensionOptionsService.get()).matchLocalDanmaku) {
      const customEpisode = await this.danmakuService.getCustomByTitle(
        stripExtension(title)
      )

      if (customEpisode) {
        return {
          status: 'success',
          data: customEpisode,
        }
      }
    }

    const mapping = await this.titleMappingService.get(mapKey)

    const automaticProvider =
      await providerConfigService.getFirstAutomaticProvider()

    if (mapping || seasonId) {
      let season: Season | undefined

      if (seasonId) {
        this.logger.debug('Using provided season id')
        season = await this.seasonService.getById(seasonId)
        if (season) {
          await this.titleMappingService.add(
            SeasonMap.fromSeason(mapKey, season)
          )
        } else {
          return {
            status: 'notFound',
            data: null,
          }
        }
      } else if (mapping) {
        const seasonId = mapping.getSeasonId(automaticProvider.id)
        if (seasonId !== undefined) {
          this.logger.debug('Mapping found, using mapped title', mapping)
          season = await this.seasonService.getById(seasonId)
        }
      }

      if (!season) {
        return {
          status: 'notFound',
          data: null,
        }
      }

      return {
        status: 'success',
        data: await findEpisodeInSeason(season),
      }
    }

    this.logger.debug('No mapping found, searching for season')

    const service = this.providerRegistry.mustGet(automaticProvider.impl)

    const foundSeasons = (await service.search(
      {
        keyword: title,
        providerConfigId: automaticProvider.id,
      },
      automaticProvider
    )) as DanDanPlayOf<Season>[]

    if (foundSeasons.length === 0) {
      this.logger.debug(`No season found for title: ${title}`)
      return {
        status: 'notFound',
        data: null,
      }
    }

    if (foundSeasons.length === 1) {
      this.logger.debug('Single season found', foundSeasons[0])

      await this.titleMappingService.add(
        SeasonMap.fromSeason(mapKey, foundSeasons[0])
      )

      return {
        status: 'success',
        data: await findEpisodeInSeason(foundSeasons[0]),
      }
    }

    this.logger.debug(
      'Multiple seasons found, disambiguation required',
      foundSeasons
    )
    return {
      status: 'disambiguation',
      data: foundSeasons,
    }
  }

  async parseUrl(url: string) {
    const providers = this.providerRegistry.getAll()

    for (const provider of providers) {
      if (provider.parseUrl && provider.canParse?.(url)) {
        const result = await provider.parseUrl(url)
        if (result) return result
      }
    }

    throw new Error('No provider found capable of parsing URL')
  }
}
