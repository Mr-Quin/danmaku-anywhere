import type {
  TencentEpisodeListItem,
  TencentVideoSeason,
} from '@danmaku-anywhere/danmaku-provider/tencent'
import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'

import type { DanmakuService } from '@/background/services/DanmakuService'
import type { SeasonService } from '@/background/services/SeasonService'
import { Logger } from '@/common/Logger'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProvider } from '@/common/danmaku/utils'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import type {
  EpisodeMeta,
  Season,
  SeasonInsert,
  TencentOf,
} from '@danmaku-anywhere/danmaku-converter'
import type { WithSeason } from '@danmaku-anywhere/danmaku-converter'

export class TencentService {
  private logger: typeof Logger

  private extensionOptionsService = extensionOptionsService

  constructor(
    private seasonService: SeasonService,
    private danmakuService: DanmakuService
  ) {
    this.logger = Logger.sub('[TencentService]')
  }

  // test if the cookies are working
  async testCookies() {
    this.logger.debug('Testing tencent cookies')
    try {
      await this.getPageDetails('mzc00200xf3rir6', 'i0046sewh4r')
      return true
    } catch (e) {
      if (e instanceof tencent.TencentApiException) {
        if (e.cookie) {
          this.logger.debug('Request rejected because of lack of cookies', e)
        }
      } else {
        this.logger.error('Test tencent cookies test failed', e)
      }
      return false
    }
  }

  async search(keyword: string): Promise<TencentOf<Season>[]> {
    this.logger.debug('Search tencent', keyword)
    const result = await tencent.searchMedia({ query: keyword })
    this.logger.debug('Search result', result)
    const mapToSeason = (data: TencentVideoSeason): TencentOf<SeasonInsert> => {
      return {
        provider: DanmakuSourceType.Tencent,
        title: data.videoInfo.title,
        type: data.videoInfo.videoType.toString(),
        imageUrl: data.videoInfo.imgUrl,
        providerIds: {
          cid: data.doc.id,
        },
        indexedId: data.doc.id,
        episodeCount: data.videoInfo.episodeSites[0].totalEpisode,
        year: data.videoInfo.year,
        schemaVersion: 1,
      }
    }
    const seasons = result.map(mapToSeason)
    return this.seasonService.bulkUpsert(seasons)
  }

  async getEpisodes(
    seasonId: number
  ): Promise<WithSeason<TencentOf<EpisodeMeta>>[]> {
    this.logger.debug('Get episode', seasonId)
    const season = await this.seasonService.mustGetById(seasonId)
    assertProvider(season, DanmakuSourceType.Tencent)

    const generator = tencent.listEpisodes({
      cid: season.providerIds.cid,
      vid: '',
    })

    const result: TencentEpisodeListItem[][] = []
    for await (const items of generator) {
      result.push(items)
    }

    this.logger.debug('Get episode result', result)

    return result.flat().map((item) => {
      return {
        provider: DanmakuSourceType.Tencent,
        title: item.play_title,
        alternativeTitle: [item.title, item.union_title],
        providerIds: {
          vid: item.vid,
        },
        imageUrl: item.image_url,
        season,
        seasonId,
        indexedId: item.vid.toString(),
        schemaVersion: 4,
        lastChecked: Date.now(),
      } satisfies WithSeason<TencentOf<EpisodeMeta>>
    })
  }

  async getPageDetails(cid: string, vid: string) {
    this.logger.debug('Get page details', { cid, vid })

    const result = await tencent.getPageDetails(cid, vid)

    this.logger.debug('Get page details result', result)

    return result
  }

  async saveEpisode(meta: TencentOf<EpisodeMeta>) {
    const comments = await this.getDanmaku(meta.providerIds.vid)
    return this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
    })
  }

  async getDanmaku(vid: string) {
    return await tencent.getDanmaku(vid)
  }

  /**
   * Don't use
   *
   * @deprecated
   */
  async getEpisodeByUrl(url: string) {
    const { pathname } = new URL(url)

    // https://v.qq.com/x/cover/mzc00200ztsl4to/m4100bardal.html
    const [, cid, vid] = pathname.match(/cover\/(.*)\/(.*)\.html/) ?? []

    if (!cid || !vid) throw new Error('Invalid tencent url')

    // get the name of the show
    const pageDetails = await this.getPageDetails(cid, vid)
    const foundSeason =
      pageDetails.module_list_datas[0]?.module_datas[0]?.item_data_lists
        ?.item_datas[0]

    if (!foundSeason) throw new Error('Season not found')

    const _ = await this.seasonService.upsert({
      provider: DanmakuSourceType.Tencent,
      title: foundSeason.item_params.play_title,
      type: foundSeason.item_type.toString(),
      imageUrl: foundSeason.item_params.image_url,
      providerIds: {
        cid: foundSeason.item_params.cid,
      },
      indexedId: foundSeason.item_params.cid.toString(),
      schemaVersion: 1,
    })

    // get the name of the episode
    // const episodes = await this.getEpisodes(season.id)
    // const matchingEpisode = episodes.find((episode) => episode.vid === vid)
    // if (!matchingEpisode) throw new Error('Episode not found')
  }
}
