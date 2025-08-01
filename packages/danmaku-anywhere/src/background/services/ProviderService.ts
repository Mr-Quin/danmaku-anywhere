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
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class ProviderService {
  private logger: typeof Logger

  constructor(
    private titleMappingService: TitleMappingService,
    private danmakuService: DanmakuService,
    private seasonService: SeasonService,
    private danDanPlayService: DanDanPlayService,
    private bilibiliService: BilibiliService,
    private tencentService: TencentService
  ) {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[ProviderService]')
  }

  async searchSeason(params: SeasonSearchParams) {
    switch (params.provider) {
      case DanmakuSourceType.DanDanPlay: {
        return this.danDanPlayService.search({
          anime: params.keyword,
          episode: params.episode,
        })
      }
      case DanmakuSourceType.Bilibili: {
        return this.bilibiliService.search({
          keyword: params.keyword,
        })
      }
      case DanmakuSourceType.Tencent: {
        return this.tencentService.search(params.keyword)
      }
    }
  }

  async searchEpisodes(params: EpisodeSearchParams) {
    const { seasonId, provider } = params
    switch (provider) {
      case DanmakuSourceType.DanDanPlay: {
        return this.danDanPlayService.getAnimeDetails(seasonId)
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
        await this.danDanPlayService.getBangumiDetails(
          season.providerIds.bangumiId
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
          const episode = await this.danDanPlayService.saveEpisode(
            rest,
            meta.season,
            meta.params
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
      const episodes = await this.danDanPlayService.getAnimeDetails(season.id)

      if (episodes.length === 0) {
        throw new Error(`No episodes found for season: ${season}`)
      }

      const episodeId = this.danDanPlayService.computeEpisodeId(
        season.providerIds.animeId,
        episodeNumber
      )

      const episode = episodes.find(
        (ep) => ep.providerIds.episodeId === episodeId
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

      const season = await this.seasonService.mustGetById(sid)
      assertProvider(season, DanmakuSourceType.DanDanPlay)

      return {
        status: 'success',
        data: await getMetaFromSeason(season),
      }
    }

    this.logger.debug('No mapping found, searching for season')

    const foundSeasons = await this.danDanPlayService.search({
      anime: title,
    })

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
