import type { ManifestRunner } from '@danmaku-anywhere/dango'
import type {
  CommentEntity,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuProviderError } from '@danmaku-anywhere/danmaku-provider'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'
import type { Result } from '@danmaku-anywhere/result'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import type { ILogger } from '@/common/Logger'
import type { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { DanDanPlayProviderConfig } from '@/common/options/providerConfig/schema'
import { tryCatch } from '@/common/utils/tryCatch'
import { findEpisodeByNumber } from '../common/findEpisodeByNumber'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  SeasonSearchParams,
} from '../IDanmakuProvider'
import { getDdpCompatRunner, getDdpRunner } from '../manifestRunners'
import { DanDanPlayMapper } from './DanDanPlayMapper'

// DDP's `providerIds` shape — opaque at the storage layer, narrowed here
// at the service boundary where we know the manifest produced it.
type DdpSeasonIds = { animeId: number; bangumiId: string }
type DdpEpisodeIds = { episodeId: number }

function seasonIds(p: Record<string, unknown>): DdpSeasonIds {
  return p as DdpSeasonIds
}

function episodeIds(p: Record<string, unknown>): DdpEpisodeIds {
  return p as DdpEpisodeIds
}

export class DanDanPlayService implements IDanmakuProvider {
  private logger: ILogger

  private readonly context: danDanPlay.DanDanPlayQueryContext

  readonly forProvider = DanmakuSourceType.DanDanPlay

  constructor(
    private config: DanDanPlayProviderConfig,
    logger: ILogger,
    private readonly extensionOptionsService: ExtensionOptionsService
  ) {
    this.logger = logger.sub('[DDPService]')
    this.context = DanDanPlayMapper.toQueryContext(this.config)
  }

  private async useManifest(): Promise<boolean> {
    const { useManifest } = await this.extensionOptionsService.get()
    return useManifest
  }

  /**
   * Picks `builtin:ddp-compat` for `'DanDanPlayCompatible'` configs that
   * supply a `baseUrl`, otherwise routes through `builtin:dandanplay`
   * (proxy-backed). Mirrors `DanDanPlayMapper.toQueryContext`.
   */
  private resolveManifest(): {
    runner: ManifestRunner
    extraInputs: Record<string, unknown>
  } {
    if (this.config.type !== 'DanDanPlayCompatible') {
      return { runner: getDdpRunner(), extraInputs: {} }
    }
    const baseUrl = this.config.options.baseUrl?.trim()
    if (!baseUrl) {
      return { runner: getDdpRunner(), extraInputs: {} }
    }
    const { auth } = this.config.options
    const authHeaders = auth?.enabled && auth.headers ? auth.headers : []
    return {
      runner: getDdpCompatRunner(),
      extraInputs: { baseUrl, authHeaders },
    }
  }

  async search(searchParams: SeasonSearchParams): Promise<SeasonInsert[]> {
    this.logger.debug('Searching DanDanPlay', searchParams, this.config)

    if (await this.useManifest()) {
      return this.searchViaManifest(searchParams)
    }

    const result = await danDanPlay.searchSearchAnime(
      searchParams.keyword,
      this.context
    )

    if (!result.success) {
      throw result.error
    }

    this.logger.debug('Search result', result.data)

    return result.data.map((item) =>
      DanDanPlayMapper.searchResultToSeasonInsert(item, this.config.id)
    )
  }

  private async searchViaManifest(
    searchParams: SeasonSearchParams
  ): Promise<SeasonInsert[]> {
    this.logger.debug('Searching DanDanPlay via manifest', searchParams)
    const { runner, extraInputs } = this.resolveManifest()
    const results = await runner.runSearch<
      Parameters<typeof DanDanPlayMapper.manifestSearchToSeasonInsert>[0][]
    >({ q: searchParams.keyword, ...extraInputs })
    this.logger.debug('Manifest search result', results)
    return results.map((item) =>
      DanDanPlayMapper.manifestSearchToSeasonInsert(item, this.config.id)
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
      seasonIds(season.providerIds).animeId
    )

    if (!episode) {
      return null
    }

    return {
      ...episode,
      seasonId: season.id,
      season,
    }
  }

  async getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<OmitSeasonId<EpisodeMeta>[]> {
    this.logger.debug('Getting DanDanPlay episodes', seasonRemoteIds)
    const { bangumiId } = seasonIds(seasonRemoteIds)

    if (await this.useManifest()) {
      const { runner, extraInputs } = this.resolveManifest()
      const results = await runner.runEpisodes<
        Parameters<typeof DanDanPlayMapper.manifestEpisodeToEpisodeMeta>[0][]
      >({ bangumiId, ...extraInputs })
      this.logger.debug('Manifest episodes fetched', results)
      return results.map(DanDanPlayMapper.manifestEpisodeToEpisodeMeta)
    }

    const bangumiDetailsRes = await danDanPlay.getBangumiAnime(
      bangumiId,
      this.context
    )

    if (!bangumiDetailsRes.success) {
      throw bangumiDetailsRes.error
    }

    const bangumiDetails = bangumiDetailsRes.data

    this.logger.debug('DanDanPlay Episodes fetched', bangumiDetails)

    return bangumiDetails.episodes.map((item) => {
      return DanDanPlayMapper.bangumiEpisodeToEpisodeMeta(item)
    })
  }

  async getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]> {
    const { meta, options = {} } = request
    const { season, ...rest } = meta
    assertProviderType(season, DanmakuSourceType.DanDanPlay)

    return this.getEpisodeDanmaku(rest, season, options.dandanplay ?? {})
  }

  async getSeason(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null> {
    const bangumiDetailsRes = await danDanPlay.getBangumiAnime(
      seasonIds(seasonRemoteIds).bangumiId,
      this.context
    )

    if (!bangumiDetailsRes.success) {
      throw bangumiDetailsRes.error
    }

    const bangumiDetails = bangumiDetailsRes.data

    return DanDanPlayMapper.bangumiDetailsToSeasonInsert(
      bangumiDetails,
      this.config.id
    )
  }

  private async getEpisodeDanmaku(
    meta: OmitSeasonId<EpisodeMeta>,
    season: Season,
    params: Partial<danDanPlay.GetCommentQuery>
  ): Promise<CommentEntity[]> {
    if (await this.useManifest()) {
      const { runner, extraInputs } = this.resolveManifest()
      const raw = await runner.runDanmaku<
        Parameters<typeof DanDanPlayMapper.manifestCommentsToComments>[0]
      >({
        episodeId: episodeIds(meta.providerIds).episodeId,
        ...extraInputs,
      })
      const comments = DanDanPlayMapper.manifestCommentsToComments(raw)
      this.logger.debug('Manifest danmaku fetched', comments.length)
      return comments
    }
    const { comments } = await this.fetchDanmaku(meta, season, params)

    return comments
  }

  async preloadNextEpisode(request: DanmakuFetchByMeta) {
    const meta = request.meta
    assertProviderType(meta, DanmakuSourceType.DanDanPlay)

    const currentEpisodeId = episodeIds(meta.providerIds).episodeId
    const params = request.options?.dandanplay ?? {}

    const nextEpisodeId = currentEpisodeId + 1

    const episodes = await this.getEpisodes(meta.season.providerIds)
    const nextEpisode = episodes.find(
      (e) => episodeIds(e.providerIds).episodeId === nextEpisodeId
    )

    if (!nextEpisode) {
      this.logger.debug('Next episode not found', nextEpisodeId)
      return
    }

    await this.getEpisodeDanmaku(nextEpisode, meta.season, params)
  }

  private async fetchDanmaku(
    meta: OmitSeasonId<EpisodeMeta>,
    season: Season,
    params: Partial<danDanPlay.GetCommentQuery>
  ): Promise<{
    meta: OmitSeasonId<EpisodeMeta>
    comments: CommentEntity[]
    params: danDanPlay.GetCommentQuery
  }> {
    const chConvert = params.chConvert ?? this.config.options.chConvert

    const findEpisode = async (bangumiId: string, episodeId: number) => {
      const [bangumiDetailsRes, err] = await tryCatch(
        async () => await danDanPlay.getBangumiAnime(bangumiId, this.context)
      )

      if (err) {
        this.logger.debug('Failed to get bangumi data', err)
        throw err
      }

      if (!bangumiDetailsRes.success) {
        throw bangumiDetailsRes.error
      }

      const bangumiDetails = bangumiDetailsRes.data

      const episode = bangumiDetails.episodes.find(
        (e) => e.episodeId === episodeId
      )

      return episode?.episodeTitle
    }

    const { episodeId } = episodeIds(meta.providerIds)
    const seasonIdsResolved = seasonIds(season.providerIds)

    // apply default params, use chConvert specified in options
    const paramsCopy: danDanPlay.GetCommentQuery = {
      chConvert,
      withRelated: params.withRelated ?? true,
      from: params.from ?? 0,
    }

    // since the title can change, we'll try to update it
    const episodeTitle =
      (await findEpisode(
        seasonIdsResolved.bangumiId ?? seasonIdsResolved.animeId.toString(),
        episodeId
      )) ?? meta.title // if for some reason we can't get the title, use the one we have

    if (!episodeTitle) {
      this.logger.debug('Failed to get episode title from server')
      throw new Error('Failed to get episode title from server')
    }

    const newMeta = {
      ...meta,
      title: episodeTitle,
    }

    this.logger.debug('Fetching danmaku', meta, paramsCopy)

    const commentsRes = await danDanPlay.commentGetComment(
      episodeId,
      paramsCopy,
      this.context
    )

    if (!commentsRes.success) {
      throw commentsRes.error
    }

    const comments = commentsRes.data

    this.logger.debug('Danmaku fetched from server', comments)

    return {
      meta: newMeta,
      comments,
      params: paramsCopy,
    }
  }

  private findEpisodeInList(
    episodes: OmitSeasonId<EpisodeMeta>[],
    episodeNumber: number,
    animeId: number
  ) {
    const episode = findEpisodeByNumber(episodes, episodeNumber)

    if (episode) {
      return episode
    }

    // match by computed episode id
    const computedId = this.computeEpisodeId(animeId, episodeNumber)

    return episodes.find(
      (ep) => episodeIds(ep.providerIds).episodeId === computedId
    )
  }

  async sendComment(
    request: danDanPlay.SendCommentRequest
  ): Promise<Result<{ cid: number }, DanmakuProviderError>> {
    return danDanPlay.commentSendComment(request)
  }

  async register(
    request: danDanPlay.RegisterRequestV2
  ): Promise<Result<danDanPlay.LoginResponse, DanmakuProviderError>> {
    this.logger.debug('Registering user', request)

    const res = danDanPlay.registerRegisterMainUser(request)

    this.logger.debug('Registered user', res)

    return res
  }

  async login(
    request: danDanPlay.LoginRequest
  ): Promise<Result<danDanPlay.LoginResponse, DanmakuProviderError>> {
    this.logger.debug('Logging in')

    return danDanPlay.loginLogin(request)
  }

  async renew(): Promise<
    Result<danDanPlay.LoginResponse, DanmakuProviderError>
  > {
    this.logger.debug('Renewing token')

    return danDanPlay.loginRenewToken()
  }

  computeEpisodeId(animeId: number, episodeNumber: number) {
    return animeId * 10000 + episodeNumber
  }
}
