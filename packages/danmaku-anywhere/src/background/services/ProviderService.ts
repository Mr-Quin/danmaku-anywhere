import type {
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
import type { DanmakuFetchDto, EpisodeSearchParams } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProvider } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import type {
  BuiltInDanDanPlayProvider,
  DanDanPlayCompatProvider,
} from '@/common/options/providerConfig/schema'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { assertProviderImpl } from '@/common/options/providerConfig/utils'
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

  /**
   * Get DanDanPlay provider config from params
   * Falls back to built-in dandanplay if not specified or not found
   */
  private async getDanDanPlayProvider(
    providerId?: string
  ): Promise<BuiltInDanDanPlayProvider | DanDanPlayCompatProvider> {
    if (providerId) {
      const provider = await providerConfigService.get(providerId)
      if (
        provider &&
        (provider.type === 'DanDanPlay' ||
          provider.type === 'DanDanPlayCompatible')
      ) {
        return provider as BuiltInDanDanPlayProvider | DanDanPlayCompatProvider
      }
      this.logger.warn(
        `Provider ${providerId} not found or not DanDanPlay compatible, falling back to built-in`
      )
    }

    // Fallback to built-in dandanplay
    const fallback = await providerConfigService.get('dandanplay')
    if (!fallback) {
      throw new Error('Built-in dandanplay provider not found')
    }
    return fallback as BuiltInDanDanPlayProvider
  }

  async searchSeason(params: SeasonSearchParams) {
    const providerConfig = params.providerConfig

    switch (params.providerConfig.impl) {
      case DanmakuSourceType.DanDanPlay: {
        assertProviderImpl(providerConfig, DanmakuSourceType.DanDanPlay)
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
      case DanmakuSourceType.Custom: {
        assertProviderImpl(providerConfig, DanmakuSourceType.Custom)
        return await this.customProviderService.search(
          params.customBaseUrl,
          params.keyword
        )
      }
    }
  }

  async searchEpisodes(params: EpisodeSearchParams) {
    const { seasonId, provider } = params
    switch (provider) {
      case DanmakuSourceType.DanDanPlay: {
        const season = await this.seasonService.mustGetById(seasonId)
        assertProvider(season, DanmakuSourceType.DanDanPlay)
        const providerConfig = await this.getDanDanPlayProvider(
          season.providerIds.providerInstanceId
        )
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

    switch (season.provider) {
      case DanmakuSourceType.DanDanPlay: {
        assertProvider(season, DanmakuSourceType.DanDanPlay)
        const providerConfig = await this.getDanDanPlayProvider(
          season.providerIds.providerInstanceId
        )
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
        const providerIds = data.meta.season.providerIds
        const providerId =
          'providerInstanceId' in providerIds
            ? providerIds.providerInstanceId
            : undefined
        const providerConfig = await this.getDanDanPlayProvider(providerId)

        void this.danDanPlayService.getNextEpisodeDanmaku(
          data.meta,
          data.meta.season,
          data.meta.params ?? {},
          providerConfig
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

    const [existingDanmaku] = await this.danmakuService.filter({
      provider,
      indexedId: meta.indexedId,
    })

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      assertProvider(existingDanmaku, provider)
      const season = await this.seasonService.mustGetById(
        existingDanmaku.seasonId
      )
      assertProvider(season, provider)
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

    const danmaku = (await match(data)
      .with(
        { meta: { provider: DanmakuSourceType.Bilibili } },
        async ({ meta }) => {
          const episode = await this.bilibiliService.saveEpisode(meta)
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

          // Get provider config from episode's season metadata
          const providerIds = meta.season.providerIds
          const providerId =
            'providerInstanceId' in providerIds
              ? providerIds.providerInstanceId
              : undefined
          const providerConfig = await this.getDanDanPlayProvider(providerId)

          const episode = await this.danDanPlayService.getEpisodeDanmaku(
            rest,
            meta.season,
            meta.params ?? {},
            providerConfig
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
      const providerConfig = await this.getDanDanPlayProvider(
        season.providerIds.providerInstanceId
      )
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

    if (mapping || seasonId) {
      if (mapping) {
        this.logger.debug('Mapping found, using mapped title', mapping)
      } else if (seasonId) {
        this.logger.debug('Using provided season id')
        await this.titleMappingService.add({
          key: mapKey,
          DanDanPlay: seasonId,
        })
      }

      const sid = seasonId ?? mapping?.DanDanPlay

      if (!sid) {
        throw new Error('No season id provided')
      }

      const season = await this.seasonService.getById(sid)

      if (!season) {
        return {
          status: 'notFound',
          data: null,
        }
      }

      assertProvider(season, DanmakuSourceType.DanDanPlay)

      return {
        status: 'success',
        data: await getMetaFromSeason(season),
      }
    }

    this.logger.debug('No mapping found, searching for season')

    // Use built-in provider for automatic matching
    const builtInProvider = await this.getDanDanPlayProvider(undefined)
    const foundSeasons = await this.danDanPlayService.search(
      {
        anime: title,
      },
      builtInProvider
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
      const meta = await getMetaFromSeason(foundSeasons[0])

      await this.titleMappingService.add({
        key: mapKey,
        DanDanPlay: meta.seasonId,
      })

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
