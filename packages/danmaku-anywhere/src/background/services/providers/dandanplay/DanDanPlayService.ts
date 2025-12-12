import type {
  CommentEntity,
  DanDanPlayOf,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType, isProvider } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type { DanDanPlayProviderConfig } from '@/common/options/providerConfig/schema'
import { tryCatch } from '@/common/utils/utils'
import { findEpisodeByNumber } from '../common/findEpisodeByNumber'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  SeasonSearchParams,
} from '../IDanmakuProvider'
import { DanDanPlayMapper } from './DanDanPlayMapper'

export class DanDanPlayService implements IDanmakuProvider {
  private logger: typeof Logger

  private readonly context: danDanPlay.DanDanPlayQueryContext

  readonly forProvider = DanmakuSourceType.DanDanPlay

  constructor(private config: DanDanPlayProviderConfig) {
    this.logger = Logger.sub('[DDPService]')
    this.context = DanDanPlayMapper.toQueryContext(this.config)
  }

  async search(searchParams: SeasonSearchParams): Promise<SeasonInsert[]> {
    this.logger.debug('Searching DanDanPlay', searchParams, this.config)

    const result = await danDanPlay.searchSearchAnime(
      searchParams.keyword,
      this.context
    )
    this.logger.debug('Search result', result)

    return result.map((item) =>
      DanDanPlayMapper.searchResultToSeasonInsert(item, this.config.id)
    )
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    const episodes = await this.getEpisodes(season.providerIds)

    if (episodes.length === 0) {
      throw new Error(`No episodes found for season: ${season}`)
    }

    const episode = this.findEpisodeInList(
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
      seasonId: season.id,
      season,
    }
  }

  async getEpisodes(
    seasonRemoteIds: DanDanPlayOf<Season>['providerIds']
  ): Promise<OmitSeasonId<DanDanPlayOf<EpisodeMeta>>[]> {
    this.logger.debug('Getting DanDanPlay episodes', seasonRemoteIds)

    const bangumiDetails = await danDanPlay.getBangumiAnime(
      seasonRemoteIds.bangumiId,
      this.context
    )

    this.logger.debug('DanDanPlay Episodes fetched', bangumiDetails)

    return bangumiDetails.episodes.map((item) => {
      return DanDanPlayMapper.bangumiEpisodeToEpisodeMeta(item)
    })
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<CommentEntity[]> {
    const { meta, options = {} } = request
    const { season, ...rest } = meta
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    return this.getEpisodeDanmaku(
      rest as DanDanPlayOf<EpisodeMeta>,
      season,
      options.dandanplay ?? {}
    )
  }

  async getSeason(
    seasonRemoteIds: DanDanPlayOf<Season>['providerIds']
  ): Promise<SeasonInsert | null> {
    const bangumiDetails = await danDanPlay.getBangumiAnime(
      seasonRemoteIds.bangumiId,
      this.context
    )

    const seasonInsert: DanDanPlayOf<SeasonInsert> =
      DanDanPlayMapper.bangumiDetailsToSeasonInsert(
        bangumiDetails,
        this.config.id
      )

    return seasonInsert
  }

  private async getEpisodeDanmaku(
    meta: OmitSeasonId<DanDanPlayOf<EpisodeMeta>>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>
  ): Promise<CommentEntity[]> {
    const { comments } = await this.fetchDanmaku(meta, season, params)

    return comments
  }

  async preloadNextEpisode(request: DanmakuFetchRequest) {
    const meta = request.meta
    assertProviderType(meta, DanmakuSourceType.DanDanPlay)

    const currentEpisodeId = meta.providerIds.episodeId
    const params = request.options?.dandanplay ?? {}

    const nextEpisodeId = currentEpisodeId + 1

    const episodes = await this.getEpisodes(meta.season.providerIds)
    const nextEpisode = episodes.find(
      (e) => e.providerIds.episodeId === nextEpisodeId
    )

    if (!nextEpisode) {
      this.logger.debug('Next episode not found', nextEpisodeId)
      return
    }

    await this.getEpisodeDanmaku(nextEpisode, meta.season, params)
  }

  private async fetchDanmaku(
    meta: OmitSeasonId<DanDanPlayOf<EpisodeMeta>>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>
  ): Promise<{
    meta: OmitSeasonId<DanDanPlayOf<EpisodeMeta>>
    comments: CommentEntity[]
    params: danDanPlay.GetCommentQuery
  }> {
    const chConvert = params.chConvert ?? this.config.options.chConvert

    const findEpisode = async (bangumiId: string, episodeId: number) => {
      const [bangumiDetails, err] = await tryCatch(
        async () => await danDanPlay.getBangumiAnime(bangumiId, this.context)
      )

      if (err) {
        this.logger.debug('Failed to get bangumi data', err)
        throw err
      }

      const episode = bangumiDetails.episodes.find(
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
      this.context
    )

    this.logger.debug('Danmaku fetched from server', comments)

    return {
      meta: newMeta,
      comments,
      params: paramsCopy,
    }
  }

  private findEpisodeInList(
    episodes: OmitSeasonId<DanDanPlayOf<EpisodeMeta>>[],
    episodeNumber: number,
    animeId: number
  ) {
    const episode = findEpisodeByNumber(episodes, episodeNumber)

    if (episode) {
      return episode
    }

    // match by computed episode id
    const computedId = this.computeEpisodeId(animeId, episodeNumber)

    return episodes.find((ep) => {
      return (
        isProvider(ep, DanmakuSourceType.DanDanPlay) &&
        ep.providerIds.episodeId === computedId
      )
    })
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
