import type {
  CommentEntity,
  DanDanPlayOf,
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanDanPlayQueryContext } from '@danmaku-anywhere/danmaku-provider/ddp'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'
import type { DanmakuService } from '@/background/services/DanmakuService'
import type { SeasonService } from '@/background/services/SeasonService'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type {
  BuiltInDanDanPlayProvider,
  DanDanPlayCompatProvider,
  DanDanPlayProviderConfig,
  ProviderConfig,
} from '@/common/options/providerConfig/schema'
import { tryCatch } from '@/common/utils/utils'
import type { IDanmakuProvider } from './providers/IDanmakuProvider'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import { SeasonSearchParams } from '@/common/anime/dto'

function createQueryContext(
  providerConfig: DanDanPlayProviderConfig
): DanDanPlayQueryContext {
  if (providerConfig.type === 'DanDanPlay') {
    return {
      isCustom: false,
    }
  }

  const provider = providerConfig
  if (
    !provider.options.baseUrl ||
    provider.options.baseUrl.trim().length === 0
  ) {
    return {
      isCustom: false,
    }
  }

  return {
    isCustom: true,
    baseUrl: provider.options.baseUrl,
    auth:
      provider.options.auth?.enabled && provider.options.auth.headers
        ? {
            headers: provider.options.auth.headers,
          }
        : undefined,
  }
}

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
    const context = createQueryContext(providerConfig)

    const result = await danDanPlay.searchSearchAnime(
      searchParams.keyword,
      context
    )
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
        providerConfigId: providerConfig.id,
        indexedId: item.animeId.toString(),
        year: new Date(item.startDate).getFullYear(),
        episodeCount: item.episodeCount,
        schemaVersion: 1,
      } satisfies DanDanPlayOf<SeasonInsert>
    })

    return this.seasonService.bulkUpsert(seasons)
  }

  async getSeason(bangumiId: string, providerConfig: DanDanPlayProviderConfig) {
    const context = createQueryContext(providerConfig)
    const bangumiDetails = await danDanPlay.getBangumiAnime(bangumiId, context)

    const seasonData: DanDanPlayOf<SeasonInsert> = {
      provider: DanmakuSourceType.DanDanPlay,
      title: bangumiDetails.animeTitle,
      alternativeTitles: bangumiDetails.titles?.map((t) => t.title),
      type: bangumiDetails.type,
      imageUrl: bangumiDetails.imageUrl,
      providerIds: {
        animeId: bangumiDetails.animeId,
        bangumiId: bangumiDetails.bangumiId,
      },
      providerConfigId: providerConfig.id,
      indexedId: bangumiDetails.animeId.toString(),
      episodeCount: bangumiDetails.episodes.length,
      schemaVersion: 1,
    }

    const season = await this.seasonService.upsert(seasonData)

    return {
      bangumiDetails,
      season,
    }
  }

  async getEpisodes(
    seasonId: number,
    providerConfig: ProviderConfig
  ): Promise<WithSeason<DanDanPlayOf<EpisodeMeta>>[]> {
    assertProviderConfigImpl(providerConfig, DanmakuSourceType.DanDanPlay)
    this.logger.debug('Getting DanDanPlay episodes', seasonId)
    const season = await this.seasonService.mustGetById(seasonId)
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    const { bangumiDetails } = await this.getSeason(
      season.providerIds.bangumiId,
      providerConfig
    )

    this.logger.debug('DanDanPlay Episodes fetched', bangumiDetails)

    return bangumiDetails.episodes.map((item) => {
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
      } satisfies WithSeason<DanDanPlayOf<EpisodeMeta>>
    })
  }

  async getDanmaku(
    request: DanmakuFetchRequest,
    config: ProviderConfig
  ): Promise<WithSeason<DanDanPlayOf<Episode>>> {
    assertProviderConfigImpl(config, DanmakuSourceType.DanDanPlay)

    if (request.type === 'by-id') {
      const season = await this.seasonService.mustGetById(request.seasonId)
      assertProviderType(season, DanmakuSourceType.DanDanPlay)
      const episodes = await this.getEpisodes(request.seasonId, config)
      const episode = episodes.find(
        (e) => e.providerIds.episodeId === request.episodeId
      )
      if (!episode) {
        throw new Error('Episode not found')
      }
      const result = await this.getEpisodeDanmaku(
        episode,
        season,
        request.options?.dandanplay ?? {},
        config
      )
      return {
        ...result,
        season,
      }
    }

    const { meta, options = {} } = request
    const { season, ...rest } = meta
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    const result = await this.getEpisodeDanmaku(
      rest as DanDanPlayOf<EpisodeMeta>,
      season,
      options.dandanplay ?? {},
      config
    )
    return {
      ...result,
      season,
    }
  }

  async getEpisodeDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>,
    config: BuiltInDanDanPlayProvider | DanDanPlayCompatProvider
  ): Promise<DanDanPlayOf<Episode>> {
    const { comments } = await this.fetchDanmaku(meta, season, params, config)

    return this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
      params,
    })
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
      currentEpisodeId = request.meta.providerIds.episodeId
      seasonId = request.meta.seasonId
      params = request.options?.dandanplay ?? request.meta.params ?? {}
    }

    const season = await this.seasonService.mustGetById(seasonId)
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    const nextEpisodeId = currentEpisodeId + 1

    const episodes = await this.getEpisodes(season.id, providerConfig)
    const nextEpisode = episodes.find(
      (e) => e.providerIds.episodeId === nextEpisodeId
    )

    if (!nextEpisode) {
      this.logger.debug('Next episode not found', nextEpisodeId)
      return null
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
    const context = createQueryContext(providerConfig)

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
