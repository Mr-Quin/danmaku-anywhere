import type {
  BilibiliOf,
  Episode,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { BiliBiliSearchParams } from '@danmaku-anywhere/danmaku-provider/bilibili'
import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanmakuService } from '@/background/services/DanmakuService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type {
  BuiltInBilibiliProvider,
  ProviderConfig,
} from '@/common/options/providerConfig/schema'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import type { IDanmakuProvider } from '../IDanmakuProvider'
import { BilibiliMapper } from './BilibiliMapper'

export class BilibiliService implements IDanmakuProvider {
  private logger: typeof Logger

  constructor(
    private seasonService: SeasonService,
    private danmakuService: DanmakuService
  ) {
    this.logger = Logger.sub('[BilibiliService]')
  }

  async setCookies() {
    this.logger.debug('Setting bilibili cookies')
    await bilibili.setCookies()
  }

  async getLoginStatus() {
    this.logger.debug('Get bilibili login status')
    const result = await bilibili.getCurrentUser()
    return result
  }

  async search(
    searchParams: BiliBiliSearchParams
  ): Promise<BilibiliOf<Season>[]> {
    this.logger.debug('Search bilibili', searchParams)
    const result = await bilibili.searchMedia(searchParams)
    this.logger.debug('Search result', result)

    const seasons = result.map(BilibiliMapper.toSeasonInsert)
    return this.seasonService.bulkUpsert(seasons)
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

    const season = await this.seasonService.upsert(
      BilibiliMapper.bangumiInfoToSeasonInsert(seasonInfo)
    )

    return {
      seasonInfo,
      season,
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

  async parseUrl(
    url: string
  ): Promise<WithSeason<BilibiliOf<EpisodeMeta>> | null> {
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

    return BilibiliMapper.toEpisode(episode, season)
  }

  async getEpisodes(
    dbSeasonId: number,
    _config: ProviderConfig
  ): Promise<WithSeason<BilibiliOf<EpisodeMeta>>[]> {
    this.logger.debug('Get bangumi info', dbSeasonId)
    const season = await this.seasonService.mustGetById(dbSeasonId)
    assertProviderType(season, DanmakuSourceType.Bilibili)

    const {
      providerIds: { seasonId },
    } = season

    const result = await bilibili.getBangumiInfo({ seasonId })
    this.logger.debug('Get bangumi info result', result)

    return result.episodes.map((item) => {
      return BilibiliMapper.toEpisode(item, season)
    })
  }

  async getDanmaku(
    request: DanmakuFetchRequest,
    config: ProviderConfig
  ): Promise<WithSeason<BilibiliOf<Episode>>> {
    assertProviderConfigImpl(config, DanmakuSourceType.Bilibili)

    if (request.type === 'by-id') {
      const season = await this.seasonService.mustGetById(request.seasonId)
      assertProviderType(season, DanmakuSourceType.Bilibili)

      const episodes = await this.getEpisodes(request.seasonId, config)
      const episode = episodes.find(
        (e) => e.providerIds.cid === request.episodeId
      )
      if (!episode) {
        throw new Error('Episode not found')
      }
      const result = await this.saveEpisode(episode, config)

      return {
        ...result,
        season,
      }
    }

    const { meta } = request
    assertProviderType(meta, DanmakuSourceType.Bilibili)
    const result = await this.saveEpisode(meta, config)

    return {
      ...result,
      season: meta.season,
    }
  }

  async saveEpisode(
    meta: BilibiliOf<EpisodeMeta>,
    config: BuiltInBilibiliProvider
  ): Promise<BilibiliOf<Episode>> {
    const comments = await this.fetchDanmaku(meta, config)
    return this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
    })
  }

  async fetchDanmaku(
    meta: BilibiliOf<EpisodeMeta>,
    config: BuiltInBilibiliProvider
  ) {
    const { danmakuTypePreference } = config.options

    const { cid, aid } = meta.providerIds

    if (danmakuTypePreference === 'xml') {
      return this.getDanmakuXml(cid)
    }

    if (aid === undefined) {
      throw new Error('aid is not provided')
    }

    return this.getDanmakuProto(cid, aid)
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
