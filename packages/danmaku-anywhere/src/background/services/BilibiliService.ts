import type {
  BiliBiliSearchParams,
  BilibiliBangumiInfo,
  BilibiliMedia,
} from '@danmaku-anywhere/danmaku-provider/bilibili'
import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'

import { DanmakuService } from '@/background/services/DanmakuService'
import { SeasonService } from '@/background/services/SeasonService'
import { Logger } from '@/common/Logger'
import {
  BilibiliSeasonInsertV1,
  BilibiliSeasonV1,
} from '@/common/anime/types/v1/schema'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  BiliBiliEpisodeV4,
  BiliBiliMeta,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'
import { assertProvider } from '@/common/danmaku/utils'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

export class BilibiliService {
  private logger: typeof Logger

  private extensionOptionsService = extensionOptionsService

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

  private mapToSeason(data: BilibiliMedia): BilibiliSeasonInsertV1 {
    return {
      provider: DanmakuSourceType.Bilibili,
      title: data.title,
      type: data.media_type.toString(),
      imageUrl: data.cover,
      providerIds: {
        seasonId: data.season_id,
      },
      indexedId: data.season_id.toString(),
      schemaVersion: 1,
    }
  }

  private mapToEpisode(
    data: BilibiliBangumiInfo['episodes'][number],
    season: BilibiliSeasonV1
  ): WithSeason<BiliBiliMeta> {
    return {
      provider: DanmakuSourceType.Bilibili,
      imageUrl: data.cover,
      title: data.show_title,
      alternativeTitle: [data.long_title, data.share_copy],
      externalLink: data.link,
      providerIds: {
        cid: data.cid,
        aid: data.aid,
      },
      seasonId: season.id,
      season,
      indexedId: data.cid.toString(),
      lastChecked: Date.now(),
      schemaVersion: 4,
    }
  }

  async search(
    searchParams: BiliBiliSearchParams
  ): Promise<BilibiliSeasonV1[]> {
    this.logger.debug('Search bilibili', searchParams)
    const result = await bilibili.searchMedia(searchParams)
    this.logger.debug('Search result', result)
    const seasons = result.map(this.mapToSeason)
    return this.seasonService.bulkUpsert(seasons)
  }

  async getEpisodeByUrl(url: string): Promise<WithSeason<BiliBiliMeta>> {
    this.logger.debug('Get episode by url', url)

    const { pathname } = new URL(url)

    // https://www.bilibili.com/bangumi/play/ss3421?spm_id_from=333.337.0.0
    const ssid = pathname.match(/ss(\d+)/)?.[1]
    const epid = pathname.match(/ep(\d+)/)?.[1]

    // we need one of ssid or epid
    if (!ssid && !epid) throw new Error('Invalid bilibili url')

    const seasonInfo = await bilibili.getBangumiInfo({
      seasonId: ssid ? parseInt(ssid) : undefined,
      episodeId: epid ? parseInt(epid) : undefined,
    })

    // if using season id, get the first episode
    const episode = epid
      ? seasonInfo.episodes.find((episode) => episode.id === parseInt(epid))
      : seasonInfo.episodes[0]

    if (!episode) throw new Error('Episode not found')

    const season = await this.seasonService.upsert({
      provider: DanmakuSourceType.Bilibili,
      title: seasonInfo.title,
      type: seasonInfo.type.toString(),
      imageUrl: seasonInfo.cover,
      providerIds: {
        seasonId: seasonInfo.season_id,
      },
      indexedId: seasonInfo.season_id.toString(),
      schemaVersion: 1,
    })

    return this.mapToEpisode(episode, season)
  }

  async getEpisodes(dbSeasonId: number): Promise<WithSeason<BiliBiliMeta>[]> {
    this.logger.debug('Get bangumi info', dbSeasonId)
    const season = await this.seasonService.mustGetById(dbSeasonId)
    assertProvider(season, DanmakuSourceType.Bilibili)

    const {
      providerIds: { seasonId },
    } = season

    const result = await bilibili.getBangumiInfo({ seasonId })
    this.logger.debug('Get bangumi info result', result)

    return result.episodes.map((item) => {
      return this.mapToEpisode(item, season)
    })
  }

  async saveEpisode(meta: BiliBiliMeta): Promise<BiliBiliEpisodeV4> {
    const comments = await this.getDanmaku(meta)
    return this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
    })
  }

  async getDanmaku(meta: BiliBiliMeta) {
    const pref = await this.extensionOptionsService.get()

    const { danmakuTypePreference } = pref.danmakuSources.bilibili

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
      limitPerMinute: Infinity,
    })
    this.logger.debug('Get danmaku proto result', result)
    return result
  }
}
