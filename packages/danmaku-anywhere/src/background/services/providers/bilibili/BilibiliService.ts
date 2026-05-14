import type {
  CommentEntity,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { BiliBiliSearchParams } from '@danmaku-anywhere/danmaku-provider/bilibili'
import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import type { ILogger } from '@/common/Logger'
import type { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { BuiltInBilibiliProvider } from '@/common/options/providerConfig/schema'
import { findEpisodeByNumber } from '../common/findEpisodeByNumber'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  ParseUrlResult,
  SeasonSearchParams,
} from '../IDanmakuProvider'
import { getBilibiliRunner } from '../manifestRunners'
import { BilibiliMapper } from './BilibiliMapper'

// Bilibili's `providerIds` shape — opaque at the storage layer, narrowed
// here at the service boundary where we know the manifest produced it.
type BilibiliSeasonIds = { seasonId: number; mediaId?: number }
type BilibiliEpisodeIds = {
  cid: number
  aid?: number
  bvid?: string
  epid?: number
}

function seasonIds(p: Record<string, unknown>): BilibiliSeasonIds {
  return p as BilibiliSeasonIds
}

function episodeIds(p: Record<string, unknown>): BilibiliEpisodeIds {
  return p as BilibiliEpisodeIds
}

export class BilibiliService implements IDanmakuProvider {
  private logger: ILogger

  readonly forProvider = DanmakuSourceType.Bilibili

  constructor(
    private config: BuiltInBilibiliProvider,
    logger: ILogger,
    private readonly extensionOptionsService: ExtensionOptionsService
  ) {
    this.logger = logger.sub('[BilibiliService]')
  }

  private async useManifest(): Promise<boolean> {
    const { useManifest } = await this.extensionOptionsService.get()
    return useManifest
  }

  static async setCookies(logger: ILogger) {
    logger.sub('[BilibiliService]').debug('Setting bilibili cookies')
    await bilibili.setCookies()
  }

  static async getLoginStatus(logger: ILogger) {
    logger.sub('[BilibiliService]').debug('Get bilibili login status')
    const result = await bilibili.getCurrentUser()
    if (!result.success) throw result.error
    return result.data
  }

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    if (await this.useManifest()) {
      this.logger.debug('Search bilibili via manifest', params)
      const results = await getBilibiliRunner().runSearch<
        Parameters<typeof BilibiliMapper.manifestSearchToSeasonInsert>[0][]
      >({ q: params.keyword })
      this.logger.debug('Manifest search result', results)
      return results.map(BilibiliMapper.manifestSearchToSeasonInsert)
    }

    const searchParams: BiliBiliSearchParams = {
      keyword: params.keyword,
    }
    this.logger.debug('Search bilibili', searchParams)
    const result = await bilibili.searchMedia(searchParams)
    this.logger.debug('Search result', result)

    if (!result.success) throw result.error

    return result.data.map(BilibiliMapper.toSeasonInsert)
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    const episodes = await this.getEpisodes(season.providerIds)

    if (episodes.length === 0) {
      throw new Error(`No episodes found for season: ${season.title}`)
    }

    const episode = findEpisodeByNumber(episodes, episodeNumber)

    if (!episode) {
      return null
    }

    return {
      ...episode,
      seasonId: season.id,
      season,
    }
  }

  private async getBangumiInfo({
    seasonId,
    episodeId,
  }: {
    seasonId?: number
    episodeId?: number
  }) {
    const seasonInfoResult = await bilibili.getBangumiInfo({
      seasonId,
      episodeId,
    })

    if (!seasonInfoResult.success) throw seasonInfoResult.error

    const seasonInfo = seasonInfoResult.data

    return {
      seasonInfo,
      season: BilibiliMapper.bangumiInfoToSeasonInsert(seasonInfo),
    }
  }

  canParse(url: string): boolean {
    try {
      const { hostname } = new URL(url)
      return hostname === 'www.bilibili.com'
    } catch {
      return false
    }
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    this.logger.debug('Get episode by url', url)

    const { pathname } = new URL(url)

    // https://www.bilibili.com/bangumi/play/ss3421?spm_id_from=333.337.0.0
    const ssid = pathname.match(/ss(\d+)/)?.[1]
    const epid = pathname.match(/ep(\d+)/)?.[1]

    // we need one of ssid or epid
    if (!ssid && !epid) throw new Error('Invalid bilibili url')

    const { seasonInfo, season } = await this.getBangumiInfo({
      seasonId: ssid ? Number.parseInt(ssid) : undefined,
      episodeId: epid ? Number.parseInt(epid) : undefined,
    })

    // if using season id, get the first episode
    const episode = epid
      ? seasonInfo.episodes.find(
          (episode) => episode.id === Number.parseInt(epid)
        )
      : seasonInfo.episodes[0]

    if (!episode) throw new Error('Episode not found')

    return {
      episodeMeta: BilibiliMapper.toEpisode(episode),
      seasonInsert: season,
    }
  }

  async getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<OmitSeasonId<EpisodeMeta>[]> {
    this.logger.debug('Get bangumi info', seasonRemoteIds)
    const { seasonId } = seasonIds(seasonRemoteIds)

    if (await this.useManifest()) {
      const results = await getBilibiliRunner().runEpisodes<
        Parameters<typeof BilibiliMapper.manifestEpisodeToEpisodeMeta>[0][]
      >({
        seasonId,
      })
      this.logger.debug('Manifest episodes raw', results)
      const mapped = results.map(BilibiliMapper.manifestEpisodeToEpisodeMeta)
      this.logger.debug('Manifest episodes mapped', mapped)
      return mapped
    }

    const result = await bilibili.getBangumiInfo({ seasonId })
    this.logger.debug('Get bangumi info result', result)

    if (!result.success) throw result.error

    return result.data.episodes.map((item) => {
      return BilibiliMapper.toEpisode(item)
    })
  }

  async getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]> {
    const { meta } = request
    assertProviderType(meta, DanmakuSourceType.Bilibili)

    return this.getDanmakuInternal(meta)
  }

  async getSeason(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null> {
    const { season } = await this.getBangumiInfo({
      seasonId: seasonIds(seasonRemoteIds).seasonId,
    })

    if (!season) {
      return null
    }

    return season
  }

  private async getDanmakuInternal(
    meta: WithSeason<EpisodeMeta>
  ): Promise<CommentEntity[]> {
    const { cid, aid } = episodeIds(meta.providerIds)
    const comments = await this.fetchDanmaku({ cid, aid })

    return comments
  }

  private async fetchDanmaku(ids: { cid: number; aid?: number }) {
    const { danmakuTypePreference } = this.config.options

    if (await this.useManifest()) {
      if (danmakuTypePreference === 'xml') {
        const comments = await getBilibiliRunner().runDanmaku<CommentEntity[]>({
          cid: ids.cid,
          danmakuFormat: danmakuTypePreference,
        })
        this.logger.debug('Manifest danmaku (xml) fetched', comments.length)
        return comments
      }
      const raw = await getBilibiliRunner().runDanmaku<
        Parameters<typeof BilibiliMapper.manifestSegmentsToComments>[0]
      >({
        cid: ids.cid,
        danmakuFormat: danmakuTypePreference,
      })
      const comments = BilibiliMapper.manifestSegmentsToComments(raw)
      this.logger.debug('Manifest danmaku (proto) fetched', comments.length)
      return comments
    }

    if (danmakuTypePreference === 'xml') {
      return this.getDanmakuXml(ids.cid)
    }

    if (ids.aid === undefined) {
      throw new Error('aid is not provided')
    }

    return this.getDanmakuProto(ids.cid, ids.aid)
  }

  private async getDanmakuXml(cid: number) {
    this.logger.debug('Get danmaku xml', cid)
    const result = await bilibili.getDanmakuXml(cid)
    this.logger.debug('Get danmaku xml result', result)
    if (!result.success) throw result.error
    return result.data
  }

  private async getDanmakuProto(cid: number, aid: number) {
    this.logger.debug('Get danmaku proto')
    const result = await bilibili.getDanmakuProto(cid, aid, {
      limitPerMinute: Number.POSITIVE_INFINITY,
    })
    this.logger.debug('Get danmaku proto result', result)
    if (!result.success) throw result.error
    return result.data
  }
}
