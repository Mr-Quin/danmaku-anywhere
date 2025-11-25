import type {
  CommentEntity,
  DanDanPlayOf,
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { SeasonService } from '@/background/services/persistence/SeasonService'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type { DanDanPlayProviderConfig } from '@/common/options/providerConfig/schema'
import { tryCatch } from '@/common/utils/utils'
import type { IDanmakuProvider, SeasonSearchParams } from '../IDanmakuProvider'
import { DanDanPlayMapper } from './DanDanPlayMapper'
import { findDanDanPlayEpisodeInList } from './episodeMatching'

export class DanDanPlayService implements IDanmakuProvider {
  private logger: typeof Logger

  constructor(
    private seasonService: SeasonService,
    private danmakuService: DanmakuService,
    private config: DanDanPlayProviderConfig
  ) {
    this.logger = Logger.sub('[DDPService]')
  }

  async search(searchParams: SeasonSearchParams): Promise<SeasonInsert[]> {
    this.logger.debug('Searching DanDanPlay', searchParams, this.config)
    const context = DanDanPlayMapper.toQueryContext(this.config)

    const result = await danDanPlay.searchSearchAnime(
      searchParams.keyword,
      context
    )
    this.logger.debug('Search result', result)

    return result.map((item) =>
      DanDanPlayMapper.searchResultToSeasonInsert(item, this.config.id)
    )
  }

  async getSeason(bangumiId: string) {
    const context = DanDanPlayMapper.toQueryContext(this.config)
    const bangumiDetails = await danDanPlay.getBangumiAnime(bangumiId, context)

    const seasonData: DanDanPlayOf<SeasonInsert> =
      DanDanPlayMapper.bangumiDetailsToSeasonInsert(
        bangumiDetails,
        this.config.id
      )

    const season = await this.seasonService.upsert(seasonData)

    return {
      bangumiDetails,
      season,
    }
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    const episodes = await this.getEpisodes(season.id)

    if (episodes.length === 0) {
      throw new Error(`No episodes found for season: ${season}`)
    }

    const episode = findDanDanPlayEpisodeInList(
      episodes,
      episodeNumber,
      season.providerIds.animeId
    )

    if (!episode) {
      return null
    }

    assertProviderType(episode, DanmakuSourceType.DanDanPlay)

    return {
      ...episode,
      season,
    }
  }

  async getEpisodes(
    seasonId: number
  ): Promise<WithSeason<DanDanPlayOf<EpisodeMeta>>[]> {
    this.logger.debug('Getting DanDanPlay episodes', seasonId)
    const season = (await this.seasonService.getByType(
      seasonId,
      DanmakuSourceType.DanDanPlay
    )) as DanDanPlayOf<Season>

    const { bangumiDetails } = await this.getSeason(
      season.providerIds.bangumiId
    )

    this.logger.debug('DanDanPlay Episodes fetched', bangumiDetails)

    return bangumiDetails.episodes.map((item) => {
      return DanDanPlayMapper.bangumiEpisodeToEpisodeMeta(item, season)
    })
  }

  async getDanmaku(
    request: DanmakuFetchRequest
  ): Promise<WithSeason<DanDanPlayOf<Episode>>> {
    if (request.type === 'by-id') {
      const season = (await this.seasonService.getByType(
        request.seasonId,
        DanmakuSourceType.DanDanPlay
      )) as DanDanPlayOf<Season>
      const episodes = await this.getEpisodes(request.seasonId)
      const episode = episodes.find(
        (e) => e.providerIds.episodeId === request.episodeId
      )
      if (!episode) {
        throw new Error('Episode not found')
      }
      return this.getEpisodeDanmaku(
        episode,
        season,
        request.options?.dandanplay ?? {}
      )
    }

    const { meta, options = {} } = request
    const { season, ...rest } = meta
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    return this.getEpisodeDanmaku(
      rest as DanDanPlayOf<EpisodeMeta>,
      season,
      options.dandanplay ?? {}
    )
  }

  private async getEpisodeDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>
  ): Promise<WithSeason<DanDanPlayOf<Episode>>> {
    const { comments } = await this.fetchDanmaku(meta, season, params)

    const saved = await this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
      params,
    })

    return {
      ...saved,
      season,
    }
  }

  async preloadNextEpisode(request: DanmakuFetchRequest) {
    let currentEpisodeId: number
    let seasonId: number
    let params: Partial<danDanPlay.GetCommentQuery> = {}

    if (request.type === 'by-id') {
      currentEpisodeId = request.episodeId
      seasonId = request.seasonId
      params = request.options?.dandanplay ?? {}
    } else {
      const meta = request.meta
      assertProviderType(meta, DanmakuSourceType.DanDanPlay)

      currentEpisodeId = meta.providerIds.episodeId
      seasonId = meta.seasonId
      params = request.options?.dandanplay ?? {}
    }

    const season = (await this.seasonService.getByType(
      seasonId,
      DanmakuSourceType.DanDanPlay
    )) as DanDanPlayOf<Season>

    const nextEpisodeId = currentEpisodeId + 1

    const episodes = await this.getEpisodes(season.id)
    const nextEpisode = episodes.find(
      (e) => e.providerIds.episodeId === nextEpisodeId
    )

    if (!nextEpisode) {
      this.logger.debug('Next episode not found', nextEpisodeId)
      return
    }

    await this.getEpisodeDanmaku(nextEpisode, season, params)
  }

  private async fetchDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>
  ): Promise<{
    meta: DanDanPlayOf<EpisodeMeta>
    comments: CommentEntity[]
    params: danDanPlay.GetCommentQuery
  }> {
    const context = DanDanPlayMapper.toQueryContext(this.config)

    const chConvert = params.chConvert ?? this.config.options.chConvert

    const findEpisode = async (bangumiId: string, episodeId: number) => {
      const [result, err] = await tryCatch(async () =>
        this.getSeason(bangumiId)
      )

      if (err) {
        this.logger.debug('Failed to get bangumi data', err)
        throw err
      }

      const episode = result.bangumiDetails.episodes.find(
        (e) => e.episodeId === episodeId
      )

      return episode?.episodeTitle
    }

    const { providerIds, title } = meta

    // apply default params, use chConvert specified in options
    const paramsCopy: danDanPlay.GetCommentQuery = {
      chConvert,
      withRelated: params.withRelated ?? true,
      from: params.from ?? 0,
    }

    // since the title can change, we'll try to update it
    const episodeTitle =
      (await findEpisode(
        season.providerIds.bangumiId ?? season.providerIds.animeId.toString(),
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
      paramsCopy,
      context
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

  computeEpisodeId(animeId: number, episodeNumber: number) {
    return animeId * 10000 + episodeNumber
  }
}
