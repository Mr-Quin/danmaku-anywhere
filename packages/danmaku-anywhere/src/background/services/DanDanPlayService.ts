import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'
import { configure } from '@danmaku-anywhere/danmaku-provider/ddp'

import { DanmakuService } from '@/background/services/DanmakuService'
import { SeasonService } from '@/background/services/SeasonService'
import { Logger } from '@/common/Logger'
import {
  DanDanPlaySeasonInsertV1,
  DanDanPlaySeasonV1,
} from '@/common/anime/types/v1/schema'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  DanDanPlayEpisodeV4,
  DanDanPlayMeta,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'
import { assertProvider } from '@/common/danmaku/utils'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { tryCatch } from '@/common/utils/utils'
import { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

configure({
  baseUrl: import.meta.env.VITE_PROXY_URL,
})

export class DanDanPlayService {
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService

  constructor(
    private seasonService: SeasonService,
    private danmakuService: DanmakuService
  ) {
    this.logger = Logger.sub('[DDPService]')
  }

  async search(
    searchParams: danDanPlay.SearchEpisodesQuery
  ): Promise<DanDanPlaySeasonV1[]> {
    this.logger.debug('Searching DanDanPlay', searchParams)
    const result = await danDanPlay.searchSearchAnime(searchParams.anime)
    this.logger.debug('Search result', result)

    const seasons = result.map((item) => {
      return {
        provider: DanmakuSourceType.DanDanPlay,
        title: item.animeTitle,
        type: item.type,
        imageUrl: item.imageUrl,
        providerIds: {
          animeId: item.animeId,
          bangumiId: item.bangumiId,
        },
        indexedId: item.animeId.toString(),
        year: new Date(item.startDate).getFullYear(),
        episodeCount: item.episodeCount,
        schemaVersion: 1,
      } satisfies DanDanPlaySeasonInsertV1
    })

    return this.seasonService.bulkUpsert(seasons)
  }

  async getAnimeDetails(
    seasonId: number
  ): Promise<WithSeason<DanDanPlayMeta>[]> {
    this.logger.debug('Getting DanDanPlay episodes', seasonId)
    const season = await this.seasonService.mustGetById(seasonId)
    assertProvider(season, DanmakuSourceType.DanDanPlay)

    const result = await danDanPlay.getBangumiAnime(season.providerIds.animeId)
    this.logger.debug('DanDanPlay Episodes fetched', result)

    return result.episodes.map((item) => {
      return {
        provider: DanmakuSourceType.DanDanPlay,
        episodeNumber: item.episodeNumber,
        title: item.episodeTitle,
        providerIds: {
          episodeId: item.episodeId,
        },
        season,
        seasonId: season.id,
        indexedId: item.episodeId.toString(),
        lastChecked: Date.now(),
        schemaVersion: 4,
      } satisfies WithSeason<DanDanPlayMeta>
    })
  }

  computeEpisodeId(animeId: number, episodeNumber: number) {
    return animeId * 10000 + episodeNumber
  }

  async findEpisode(animeId: number, episodeId: number) {
    const [bangumi, err] = await tryCatch(async () =>
      danDanPlay.getBangumiAnime(animeId)
    )

    if (err) {
      this.logger.debug('Failed to get bangumi data', err)
      throw err
    }

    const episode = bangumi.episodes.find((e) => e.episodeId === episodeId)

    return episode?.episodeTitle
  }

  async saveEpisode(
    meta: DanDanPlayMeta,
    season: DanDanPlaySeasonV1,
    params: Partial<danDanPlay.GetCommentQuery> = {}
  ): Promise<DanDanPlayEpisodeV4> {
    const { comments } = await this.getDanmaku(meta, season, params)

    return this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
      params,
    })
  }

  async getDanmaku(
    meta: DanDanPlayMeta,
    season: DanDanPlaySeasonV1,
    params: Partial<danDanPlay.GetCommentQuery> = {}
  ): Promise<{
    meta: DanDanPlayMeta
    comments: CommentEntity[]
    params: danDanPlay.GetCommentQuery
  }> {
    const { providerIds, title } = meta
    const {
      danmakuSources: {
        dandanplay: { chConvert: chConvertPreference },
      },
    } = await this.extensionOptionsService.get()

    // apply default params, use chConvert specified in options unless provided in params input
    const paramsCopy: danDanPlay.GetCommentQuery = {
      chConvert: params.chConvert ?? chConvertPreference,
      withRelated: params.withRelated ?? true,
      from: params.from ?? 0,
    }

    // since the title can change, we'll try to update it
    const episodeTitle =
      (await this.findEpisode(
        season.providerIds.animeId,
        providerIds.episodeId
      )) ?? title // if for some reason we can't get the title, use the one we have

    if (!episodeTitle) {
      this.logger.debug('Failed to get episode title from server')
      throw new Error('Failed to get episode title from server')
    }

    const newMeta = {
      ...meta,
      title: episodeTitle,
    }

    this.logger.debug('Fetching danmaku', meta, paramsCopy)

    const comments = await danDanPlay.commentGetComment(
      providerIds.episodeId,
      paramsCopy
    )

    this.logger.debug('Danmaku fetched from server', comments)

    return {
      meta: newMeta,
      comments,
      params: paramsCopy,
    }
  }

  async sendComment(request: danDanPlay.SendCommentRequest) {
    return danDanPlay.commentSendComment(request)
  }

  async register(request: danDanPlay.RegisterRequestV2) {
    this.logger.debug('Registering user', request)

    const res = danDanPlay.registerRegisterMainUser(request)

    this.logger.debug('Registered user', res)

    return res
  }

  async login(request: danDanPlay.LoginRequest) {
    this.logger.debug('Logging in')

    return danDanPlay.loginLogin(request)
  }

  async renew() {
    this.logger.debug('Renewing token')

    return danDanPlay.loginRenewToken()
  }
}
