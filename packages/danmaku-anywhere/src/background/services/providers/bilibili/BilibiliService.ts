import type {
  BilibiliOf,
  CommentEntity,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { BiliBiliSearchParams } from '@danmaku-anywhere/danmaku-provider/bilibili'
import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type { BuiltInBilibiliProvider } from '@/common/options/providerConfig/schema'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  ParseUrlResult,
  SeasonSearchParams,
} from '../IDanmakuProvider'
import { BilibiliMapper } from './BilibiliMapper'

export class BilibiliService implements IDanmakuProvider {
  private logger: typeof Logger

  readonly forProvider = DanmakuSourceType.Bilibili

  constructor(private config: BuiltInBilibiliProvider) {
    this.logger = Logger.sub('[BilibiliService]')
  }

  static async setCookies() {
    Logger.sub('[BilibiliService]').debug('Setting bilibili cookies')
    await bilibili.setCookies()
  }

  static async getLoginStatus() {
    Logger.sub('[BilibiliService]').debug('Get bilibili login status')
    const result = await bilibili.getCurrentUser()
    return result
  }

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    const searchParams: BiliBiliSearchParams = {
      keyword: params.keyword,
    }
    this.logger.debug('Search bilibili', searchParams)
    const result = await bilibili.searchMedia(searchParams)
    this.logger.debug('Search result', result)

    return result.map(BilibiliMapper.toSeasonInsert)
  }

  async getBangumiInfo({
    seasonId,
    episodeId,
  }: {
    seasonId?: number
    episodeId?: number
  }) {
    const seasonInfo = await bilibili.getBangumiInfo({
      seasonId,
      episodeId,
    })

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
    seasonRemoteIds: BilibiliOf<Season>['providerIds']
  ): Promise<OmitSeasonId<BilibiliOf<EpisodeMeta>>[]> {
    this.logger.debug('Get bangumi info', seasonRemoteIds)

    const result = await bilibili.getBangumiInfo({
      seasonId: seasonRemoteIds.seasonId,
    })
    this.logger.debug('Get bangumi info result', result)

    return result.episodes.map((item) => {
      return BilibiliMapper.toEpisode(item)
    })
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<CommentEntity[]> {
    const { meta } = request
    assertProviderType(meta, DanmakuSourceType.Bilibili)

    return this.getDanmakuInternal(meta)
  }

  async getSeason(
    seasonRemoteIds: BilibiliOf<Season>['providerIds']
  ): Promise<SeasonInsert | null> {
    const { season } = await this.getBangumiInfo({
      seasonId: seasonRemoteIds.seasonId,
    })

    if (!season) {
      return null
    }

    return season
  }

  private async getDanmakuInternal(
    meta: WithSeason<BilibiliOf<EpisodeMeta>>
  ): Promise<CommentEntity[]> {
    const { cid, aid } = meta.providerIds
    const comments = await this.fetchDanmaku({ cid, aid })

    return comments
  }

  private async fetchDanmaku(ids: { cid: number; aid?: number }) {
    const { danmakuTypePreference } = this.config.options

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
    return result
  }

  private async getDanmakuProto(cid: number, aid: number) {
    this.logger.debug('Get danmaku proto')
    const result = await bilibili.getDanmakuProto(cid, aid, {
      limitPerMinute: Number.POSITIVE_INFINITY,
    })
    this.logger.debug('Get danmaku proto result', result)
    return result
  }
}
