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
import type { DanmakuService } from '@/background/services/DanmakuService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { SeasonSearchParams } from '@/common/anime/dto'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type {
  BuiltInDanDanPlayProvider,
  DanDanPlayCompatProvider,
  DanDanPlayProviderConfig,
  ProviderConfig,
} from '@/common/options/providerConfig/schema'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import { tryCatch } from '@/common/utils/utils'
import type { IDanmakuProvider } from '../IDanmakuProvider'
import { DanDanPlayMapper } from './DanDanPlayMapper'
import { findDanDanPlayEpisodeInList } from './episodeMatching'

export class DanDanPlayService implements IDanmakuProvider {
  private logger: typeof Logger

  constructor(
    private seasonService: SeasonService,
    private danmakuService: DanmakuService
  ) {
    this.logger = Logger.sub('[DDPService]')
  }

  async search(
    searchParams: SeasonSearchParams,
    providerConfig: ProviderConfig
  ): Promise<DanDanPlayOf<Season>[]> {
    assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)
    this.logger.debug('Searching DanDanPlay', searchParams, providerConfig)
    const context = DanDanPlayMapper.toQueryContext(providerConfig)

    const result = await danDanPlay.searchSearchAnime(
      searchParams.keyword,
      context
    )
    this.logger.debug('Search result', result)

    const seasons = result.map((item) =>
      DanDanPlayMapper.searchResultToSeasonInsert(item, providerConfig.id)
    )

    return this.seasonService.bulkUpsert(seasons)
  }

  async getSeason(bangumiId: string, providerConfig: DanDanPlayProviderConfig) {
    const context = DanDanPlayMapper.toQueryContext(providerConfig)
    const bangumiDetails = await danDanPlay.getBangumiAnime(bangumiId, context)

    const seasonData: DanDanPlayOf<SeasonInsert> =
      DanDanPlayMapper.bangumiDetailsToSeasonInsert(
        bangumiDetails,
        providerConfig.id
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

    const providerConfig = await providerConfigService.mustGet(
      season.providerConfigId
    )

    const episodes = await this.getEpisodes(season.id, providerConfig)

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
    seasonId: number,
    providerConfig: ProviderConfig
  ): Promise<WithSeason<DanDanPlayOf<EpisodeMeta>>[]> {
    assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)
    this.logger.debug('Getting DanDanPlay episodes', seasonId)
    const season = await this.seasonService.getByType(
      seasonId,
      DanmakuSourceType.DanDanPlay
    )

    const { bangumiDetails } = await this.getSeason(
      season.providerIds.bangumiId,
      providerConfig
    )

    this.logger.debug('DanDanPlay Episodes fetched', bangumiDetails)

    return bangumiDetails.episodes.map((item) => {
      return DanDanPlayMapper.bangumiEpisodeToEpisodeMeta(item, season)
    })
  }

  async getDanmaku(
    request: DanmakuFetchRequest,
    config: ProviderConfig
  ): Promise<WithSeason<DanDanPlayOf<Episode>>> {
    assertProviderConfigImpl(config, DanmakuSourceType.DanDanPlay)

    if (request.type === 'by-id') {
      const season = await this.seasonService.getByType(
        request.seasonId,
        DanmakuSourceType.DanDanPlay
      )
      const episodes = await this.getEpisodes(request.seasonId, config)
      const episode = episodes.find(
        (e) => e.providerIds.episodeId === request.episodeId
      )
      if (!episode) {
        throw new Error('Episode not found')
      }
      return this.getEpisodeDanmaku(
        episode,
        season,
        request.options?.dandanplay ?? {},
        config
      )
    }

    const { meta, options = {} } = request
    const { season, ...rest } = meta
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    return this.getEpisodeDanmaku(
      rest as DanDanPlayOf<EpisodeMeta>,
      season,
      options.dandanplay ?? {},
      config
    )
  }

  private async getEpisodeDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>,
    config: BuiltInDanDanPlayProvider | DanDanPlayCompatProvider
  ): Promise<WithSeason<DanDanPlayOf<Episode>>> {
    const { comments } = await this.fetchDanmaku(meta, season, params, config)

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

  async preloadNextEpisode(
    request: DanmakuFetchRequest,
    providerConfig: ProviderConfig
  ) {
    assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)

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

    const season = await this.seasonService.getByType(
      seasonId,
      DanmakuSourceType.DanDanPlay
    )

    const nextEpisodeId = currentEpisodeId + 1

    const episodes = await this.getEpisodes(season.id, providerConfig)
    const nextEpisode = episodes.find(
      (e) => e.providerIds.episodeId === nextEpisodeId
    )

    if (!nextEpisode) {
      this.logger.debug('Next episode not found', nextEpisodeId)
      return
    }

    await this.getEpisodeDanmaku(nextEpisode, season, params, providerConfig)
  }

  private async fetchDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>,
    providerConfig: DanDanPlayProviderConfig
  ): Promise<{
    meta: DanDanPlayOf<EpisodeMeta>
    comments: CommentEntity[]
    params: danDanPlay.GetCommentQuery
  }> {
    const context = DanDanPlayMapper.toQueryContext(providerConfig)

    const chConvert = params.chConvert ?? providerConfig.options.chConvert

    const findEpisode = async (bangumiId: string, episodeId: number) => {
      const [result, err] = await tryCatch(async () =>
        this.getSeason(bangumiId, providerConfig)
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
