import { BilibiliService } from '@/background/services/BilibiliService'
import { DanDanPlayService } from '@/background/services/DanDanPlayService'
import { TencentService } from '@/background/services/TencentService'
import { TitleMappingService } from '@/background/services/TitleMappingService'
import { Logger } from '@/common/Logger'
import type {
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonSearchParams,
} from '@/common/anime/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'

import { DanmakuService } from '@/background/services/DanmakuService'
import { SeasonService } from '@/background/services/SeasonService'
import {
  BilibiliSeasonV1,
  DanDanPlaySeasonV1,
  TencentSeasonV1,
} from '@/common/anime/types/v1/schema'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import {
  DanDanPlayMeta,
  EpisodeV4,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'
import { assertProvider, isProvider } from '@/common/danmaku/utils'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import { match } from 'ts-pattern'

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

  async searchDanDanPlay(
    searchParams: SeasonSearchParams
  ): Promise<DanDanPlaySeasonV1[]> {
    const results = await this.danDanPlayService.search({
      anime: searchParams.keyword,
      episode: searchParams.episode,
    })

    return this.seasonService.bulkUpsert(results)
  }

  async searchBilibili(
    searchParams: SeasonSearchParams
  ): Promise<BilibiliSeasonV1[]> {
    const results = await this.bilibiliService.search({
      keyword: searchParams.keyword,
    })

    return this.seasonService.bulkUpsert(results)
  }

  async searchTencent(
    searchParams: SeasonSearchParams
  ): Promise<TencentSeasonV1[]> {
    const results = await this.tencentService.search(searchParams.keyword)

    return this.seasonService.bulkUpsert(results)
  }

  async getDanmaku(data: DanmakuFetchDto): Promise<WithSeason<EpisodeV4>> {
    const { meta, options = {}, context = {} } = data
    const provider = meta.provider

    // Save title mapping
    if (context.seasonMapKey) {
      this.logger.debug('Saving title mapping', meta)
      if (isProvider(meta, DanmakuSourceType.DanDanPlay)) {
        void this.titleMappingService.add(context.seasonMapKey, meta.season.id)
      }
    }

    const existingDanmaku = await this.danmakuService.getOne({
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
      } as WithSeason<EpisodeV4>
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
          const { season, params, ...rest } = meta
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
      .exhaustive()) satisfies EpisodeV4

    return danmaku
  }

  async findMatchingEpisodes({
    mapKey,
    title,
    episodeNumber,
    seasonId,
  }: MatchEpisodeInput): Promise<MatchEpisodeResult> {
    const mapping = await this.titleMappingService.get(mapKey)

    if (mapping) {
      this.logger.debug('Mapping found, using mapped title', mapping)

      const season = await this.seasonService.mustGetById(mapping.seasonId)
      assertProvider(season, DanmakuSourceType.DanDanPlay)

      const episodeId = this.danDanPlayService.computeEpisodeId(
        season.providerIds.animeId,
        episodeNumber ?? 1
      )
      const episodeTitle = await this.danDanPlayService.findEpisode(
        season.providerIds.animeId,
        episodeId
      )

      if (!episodeTitle) {
        this.logger.debug('Failed to get episode title from server')
        throw new Error('Failed to get episode title from server')
      }

      return {
        status: 'success',
        data: {
          provider: DanmakuSourceType.DanDanPlay,
          seasonId: mapping.seasonId,
          season,
          title: episodeTitle,
          indexedId: episodeId.toString(),
          schemaVersion: 4,
          lastChecked: Date.now(),
          providerIds: {
            episodeId: episodeId,
          },
        } satisfies WithSeason<DanDanPlayMeta>,
      }
    }

    this.logger.debug('No mapping found, searching for season')
    const foundSeasons = await this.searchDanDanPlay({
      keyword: title,
      episode: episodeNumber?.toString(),
    })

    if (foundSeasons.length === 0) {
      this.logger.debug(`No season found for title: ${title}`)
      return {
        status: 'notFound',
        data: null,
      }
    }

    const getMetaFromSeason = async (season: DanDanPlaySeasonV1) => {
      const episodes = await this.danDanPlayService.getAnimeDetails(season.id)

      if (episodes.length === 0) {
        throw new Error(`No episodes found for season: ${season}`)
      }

      return {
        ...episodes[0],
        season,
      }
    }

    if (foundSeasons.length === 1) {
      this.logger.debug('Single season found', foundSeasons[0])

      return {
        status: 'success',
        data: await getMetaFromSeason(foundSeasons[0]),
      }
    }

    // Try to disambiguate using seasonId
    if (seasonId !== undefined) {
      const disambiguatedResult = foundSeasons.filter(
        (season) => season.id === seasonId
      )

      if (disambiguatedResult.length === 1) {
        this.logger.debug('Disambiguated season', disambiguatedResult[0])

        return {
          status: 'success',
          data: await getMetaFromSeason(disambiguatedResult[0]),
        }
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

  async getDanDanPlayEpisodes(seasonId: number) {
    return this.danDanPlayService.getAnimeDetails(seasonId)
  }

  async getBilibiliEpisodes(seasonId: number) {
    return this.bilibiliService.getEpisodes(seasonId)
  }

  async getTencentEpisodes(seasonId: number) {
    return this.tencentService.getEpisodes(seasonId)
  }

  async parseUrl(url: string) {
    const { hostname, pathname } = new URL(url)

    if (hostname === 'www.bilibili.com') {
      return await this.bilibiliService.getEpisodeByUrl(url)
    }

    throw new Error('Unknown host')
  }
}
