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
import type { DanDanPlayCompatProvider } from '@/common/options/providerConfig/schema'
import { providerConfigService } from '@/common/options/providerConfig/service'
import { tryCatch } from '@/common/utils/utils'

async function createQueryContext(
  providerConfigId?: string
): Promise<DanDanPlayQueryContext> {
  if (!providerConfigId) {
    return {
      isCustom: false,
    }
  }

  const config = await providerConfigService.get(providerConfigId)
  if (!config) {
    throw new Error(
      `Provider config with ID "${providerConfigId}" not found. Please ensure the provider configuration exists.`
    )
  }

  if (config.type === 'DanDanPlay') {
    return {
      isCustom: false,
    }
  }

  if (config.type !== 'DanDanPlayCompatible') {
    throw new Error(
      `Invalid provider type "${config.type}" for DanDanPlay service. Expected "DanDanPlay" or "DanDanPlayCompatible".`
    )
  }

  const provider = config as DanDanPlayCompatProvider
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

export class DanDanPlayService {
  private logger: typeof Logger

  constructor(
    private seasonService: SeasonService,
    private danmakuService: DanmakuService
  ) {
    this.logger = Logger.sub('[DDPService]')
  }

  async search(
    searchParams: danDanPlay.SearchEpisodesQuery,
    providerConfigId?: string
  ): Promise<DanDanPlayOf<Season>[]> {
    this.logger.debug('Searching DanDanPlay', searchParams, providerConfigId)
    const context = await createQueryContext(providerConfigId)

    const result = await danDanPlay.searchSearchAnime(
      searchParams.anime,
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
        providerConfigId,
        indexedId: item.animeId.toString(),
        year: new Date(item.startDate).getFullYear(),
        episodeCount: item.episodeCount,
        schemaVersion: 1,
      } satisfies DanDanPlayOf<SeasonInsert>
    })

    return this.seasonService.bulkUpsert(seasons)
  }

  async getSeason(bangumiId: string, providerConfigId?: string) {
    const context = await createQueryContext(providerConfigId)
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
      providerConfigId,
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
    providerConfigId?: string
  ): Promise<WithSeason<DanDanPlayOf<EpisodeMeta>>[]> {
    this.logger.debug('Getting DanDanPlay episodes', seasonId)
    const season = await this.seasonService.mustGetById(seasonId)
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    const { bangumiDetails } = await this.getSeason(
      season.providerIds.bangumiId,
      providerConfigId
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
        providerConfigId,
        season,
        seasonId: season.id,
        indexedId: item.episodeId.toString(),
        lastChecked: Date.now(),
        schemaVersion: 4,
      } satisfies WithSeason<DanDanPlayOf<EpisodeMeta>>
    })
  }

  async getEpisodeDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>,
    providerConfigId?: string
  ): Promise<DanDanPlayOf<Episode>> {
    const { comments } = await this.getDanmaku(
      meta,
      season,
      params,
      providerConfigId
    )

    return this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
      params,
    })
  }

  async getNextEpisodeDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>,
    providerConfigId?: string
  ) {
    const nextEpisodeId = meta.providerIds.episodeId + 1

    const episodes = await this.getEpisodes(season.id, providerConfigId)
    const nextEpisode = episodes.find(
      (e) => e.providerIds.episodeId === nextEpisodeId
    )

    if (!nextEpisode) {
      this.logger.debug('Next episode not found', nextEpisodeId)
      return null
    }

    return this.getEpisodeDanmaku(nextEpisode, season, params, providerConfigId)
  }

  private async getDanmaku(
    meta: DanDanPlayOf<EpisodeMeta>,
    season: DanDanPlayOf<Season>,
    params: Partial<danDanPlay.GetCommentQuery>,
    providerConfigId?: string
  ): Promise<{
    meta: DanDanPlayOf<EpisodeMeta>
    comments: CommentEntity[]
    params: danDanPlay.GetCommentQuery
  }> {
    const context = await createQueryContext(providerConfigId)

    // Get chConvert from provider config if available
    let chConvert = params.chConvert
    if (!chConvert && providerConfigId) {
      const config = await providerConfigService.get(providerConfigId)
      if (config && config.type === 'DanDanPlay') {
        chConvert = config.options.chConvert
      } else if (config && config.type === 'DanDanPlayCompatible') {
        chConvert = (config as DanDanPlayCompatProvider).options.chConvert
      }
    }

    const findEpisode = async (bangumiId: string, episodeId: number) => {
      const [result, err] = await tryCatch(async () =>
        this.getSeason(bangumiId, providerConfigId)
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
