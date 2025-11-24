import type {
  CustomSeason,
  DanDanPlayOf,
  Episode,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { match } from 'ts-pattern'
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
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
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
    private customProviderService: MacCmsProviderService
  ) {
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

    switch (providerConfig.impl) {
      case DanmakuSourceType.DanDanPlay: {
        assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)
        return this.danDanPlayService.search(
          {
            anime: params.keyword,
            episode: params.episode,
          },
          providerConfig
        )
      }
      case DanmakuSourceType.Bilibili: {
        return this.bilibiliService.search({
          keyword: params.keyword,
        })
      }
      case DanmakuSourceType.Tencent: {
        return this.tencentService.search(params.keyword)
      }
      case DanmakuSourceType.MacCMS: {
        assertProviderConfigImpl(providerConfig, DanmakuSourceType.MacCMS)
        return await this.customProviderService.search(
          providerConfig.options.danmakuBaseUrl,
          params.keyword
        )
      }
    }
  }

  async fetchEpisodesBySeason(seasonId: number) {
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await providerConfigService.mustGet(
      season.providerConfigId
    )

    switch (season.provider) {
      case DanmakuSourceType.DanDanPlay: {
        assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)
        return this.danDanPlayService.getEpisodes(seasonId, providerConfig)
      }
      case DanmakuSourceType.Bilibili: {
        return this.bilibiliService.getEpisodes(seasonId)
      }
      case DanmakuSourceType.Tencent: {
        return this.tencentService.getEpisodes(seasonId)
      }
    }
  }

  async refreshSeason(filter: SeasonQueryFilter) {
    const [season] = await this.seasonService.filter(filter)

    const providerConfig = await providerConfigService.mustGet(
      season.providerConfigId
    )

    switch (season.provider) {
      case DanmakuSourceType.DanDanPlay: {
        assertProviderType(season, DanmakuSourceType.DanDanPlay)
        assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)
        await this.danDanPlayService.getSeason(
          season.providerIds.bangumiId,
          providerConfig
        )
        break
      }
      case DanmakuSourceType.Bilibili: {
        await this.bilibiliService.getBangumiInfo({
          seasonId: season.providerIds.seasonId,
        })
        break
      }
      case DanmakuSourceType.Tencent: {
        await this.tencentService.refreshSeason(season.id)
        break
      }
    }
  }

  async preloadNextEpisode(data: DanmakuFetchDto): Promise<void> {
    switch (data.meta.provider) {
      case DanmakuSourceType.DanDanPlay: {
        const config = await providerConfigService.mustGet(
          data.meta.season.providerConfigId
        )
        assertProviderConfigImpl(config, DanmakuSourceType.DanDanPlay)

        void this.danDanPlayService.getNextEpisodeDanmaku(
          data.meta,
          data.meta.season,
          data.meta.params ?? {},
          config
        )
        break
      }
      default: {
        this.logger.warn(
          `Preloading next episode is not supported for provider: ${data.meta.provider}`
        )
        break
      }
    }
  }

  async getDanmaku(data: DanmakuFetchDto): Promise<WithSeason<Episode>> {
    const { meta, options = {} } = data
    const provider = meta.provider

    const existingDanmakuCandidates = await this.danmakuService.filter({
      provider,
      indexedId: meta.indexedId,
    })

    const existingDanmaku = existingDanmakuCandidates.find(
      (item) => item.seasonId === meta.seasonId
    )

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      assertProviderType(existingDanmaku, provider)
      const season = await this.seasonService.mustGetById(
        existingDanmaku.seasonId
      )
      assertProviderType(season, provider)
      return {
        ...existingDanmaku,
        season,
      } as WithSeason<Episode>
    }

    if (options.forceUpdate) {
      this.logger.debug('Force update flag set, bypassed cache')
    } else {
      this.logger.debug('Danmaku not found in db, fetching from server')
    }

    const config = await providerConfigService.mustGet(
      meta.season.providerConfigId
    )

    const danmaku = (await match(data)
      .with(
        { meta: { provider: DanmakuSourceType.Bilibili } },
        async ({ meta }) => {
          assertProviderConfigImpl(config, DanmakuSourceType.Bilibili)

          const episode = await this.bilibiliService.saveEpisode(meta, config)
          return {
            ...episode,
            season: meta.season,
          }
        }
      )
      .with(
        { meta: { provider: DanmakuSourceType.Tencent } },
        async ({ meta }) => {
          const episode = await this.tencentService.saveEpisode(meta)
          return {
            ...episode,
            season: meta.season,
          }
        }
      )
      .with(
        { meta: { provider: DanmakuSourceType.DanDanPlay } },
        async ({ meta }) => {
          const { season, ...rest } = meta

          assertProviderConfigImpl(config, DanmakuSourceType.DanDanPlay)

          const episode = await this.danDanPlayService.getEpisodeDanmaku(
            rest,
            meta.season,
            meta.params ?? {},
            config
          )
          return {
            ...episode,
            season,
          }
        }
      )
      .exhaustive()) satisfies Episode

    return danmaku
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
      const episodes = await this.danDanPlayService.getEpisodes(
        season.id,
        providerConfig
      )

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

    const foundSeasons = await this.danDanPlayService.search(
      {
        anime: title,
      },
      automaticProvider
    )

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
      return this.bilibiliService.getEpisodeByUrl(url)
    }
    if (hostname === 'v.qq.com') {
      return this.tencentService.getEpisodeByUrl(url)
    }

    throw new Error('Unknown host')
  }
}
