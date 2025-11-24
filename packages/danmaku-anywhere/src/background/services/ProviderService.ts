import type {
  CustomSeason,
  DanDanPlayOf,
  Episode,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

import type { BilibiliService } from '@/background/services/BilibiliService'
import type { DanDanPlayService } from '@/background/services/DanDanPlayService'
import type { DanmakuService } from '@/background/services/DanmakuService'
import { findDanDanPlayEpisodeInList } from '@/background/services/episodeMatching'
import type { MacCmsProviderService } from '@/background/services/MacCmsProviderService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { TencentService } from '@/background/services/TencentService'
import type { TitleMappingService } from '@/background/services/TitleMappingService'
import type {
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonQueryFilter,
  SeasonSearchParams,
} from '@/common/anime/dto'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { ProviderRegistry } from './providers/ProviderRegistry'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { stripExtension } from '@/common/utils/stripExtension'
import { invariant, isServiceWorker } from '@/common/utils/utils'

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

    const service = this.providerRegistry.get(providerConfig.impl)
    if (!service) {
      throw new Error(`Provider service not found for ${providerConfig.impl}`)
    }
    return service.search(params, providerConfig)
  }

  async fetchEpisodesBySeason(seasonId: number) {
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await providerConfigService.mustGet(
      season.providerConfigId
    )

    const service = this.providerRegistry.get(season.provider)
    if (!service) {
      throw new Error(`Provider service not found for ${season.provider}`)
    }
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
    const provider =
      request.type === 'by-id' ? request.provider : request.meta.provider

    if (provider === DanmakuSourceType.DanDanPlay) {
      const config =
        request.type === 'by-id'
          ? await providerConfigService.mustGet(
              (await this.seasonService.mustGetById(request.seasonId))
                .providerConfigId
            )
          : await providerConfigService.mustGet(
              request.meta.season.providerConfigId
            )

      const service = this.providerRegistry.get(provider)
      if (service?.preloadNextEpisode) {
        return service.preloadNextEpisode(request, config)
      }
    }

    this.logger.warn(
      `Preloading next episode is not supported for provider: ${provider}`
    )
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

    const config =
      request.type === 'by-id'
        ? await providerConfigService.mustGet(
            (await this.seasonService.mustGetById(request.seasonId))
              .providerConfigId
          )
        : await providerConfigService.mustGet(
            request.meta.season.providerConfigId
          )

    const service = this.providerRegistry.get(provider)
    if (!service) throw new Error(`Provider service not found for ${provider}`)
    return service.getDanmaku(request, config)
  }

  async findMatchingEpisodes({
    mapKey,
    title,
    episodeNumber = 1,
    seasonId,
  }: MatchEpisodeInput): Promise<MatchEpisodeResult> {
    const getMetaFromSeason = async (season: DanDanPlayOf<Season>) => {
      const providerConfig = await providerConfigService.mustGet(
        season.providerConfigId
      )
      assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)
      const service = this.providerRegistry.get(DanmakuSourceType.DanDanPlay)
      if (!service) {
        throw new Error('DanDanPlay service not found')
      }
      const episodes = await service.getEpisodes(season.id, providerConfig)

      if (episodes.length === 0) {
        throw new Error(`No episodes found for season: ${season}`)
      }

      const episode = findDanDanPlayEpisodeInList(
        episodes,
        episodeNumber,
        season.providerIds.animeId
      )

      if (!episode) {
        throw new Error(
          `Episode ${episodeNumber} not found in season: ${season.title}`
        )
      }

      return {
        ...episode,
        season,
      }
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

      assertProviderType(season, DanmakuSourceType.DanDanPlay)

      return {
        status: 'success',
        data: await getMetaFromSeason(season),
      }
    }

    this.logger.debug('No mapping found, searching for season')

    const service = this.providerRegistry.get(DanmakuSourceType.DanDanPlay)
    if (!service) {
      throw new Error('DanDanPlay service not found')
    }

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
        data: await getMetaFromSeason(foundSeasons[0]),
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
    const { hostname } = new URL(url)

    if (hostname === 'www.bilibili.com') {
      return this.providerRegistry
        .get(DanmakuSourceType.Bilibili)
        ?.parseUrl?.(url)
    }
    if (hostname === 'v.qq.com') {
      return this.providerRegistry
        .get(DanmakuSourceType.Tencent)
        ?.parseUrl?.(url)
    }

    throw new Error('Unknown host')
  }
}
