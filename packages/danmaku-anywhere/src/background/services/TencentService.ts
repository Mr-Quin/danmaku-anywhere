import {
  type EpisodeMeta,
  PROVIDER_TO_BUILTIN_ID,
  type Season,
  type SeasonInsert,
  stripHtml,
  type TencentOf,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  TencentEpisodeListItem,
  TencentVideoSeason,
} from '@danmaku-anywhere/danmaku-provider/tencent'
import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'
import type { DanmakuService } from '@/background/services/DanmakuService'
import type { SeasonService } from '@/background/services/SeasonService'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'

export class TencentService {
  private logger: typeof Logger

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
      await tencent.getPageDetails('mzc00200xf3rir6', 'i0046sewh4r')
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
        providerConfigId: PROVIDER_TO_BUILTIN_ID.Tencent,
        title: stripHtml(data.videoInfo.title),
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
    assertProviderType(season, DanmakuSourceType.Tencent)

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
        title: stripHtml(item.play_title),
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

  /**
   * We need both the cid and vid to refresh the season info.
   * We can get the cid from the season info.
   * We can get the vid from the episode info, so there must be at least one episode in the season.
   */
  async refreshSeason(id: number) {
    const season = await this.seasonService.mustGetById(id)
    assertProviderType(season, DanmakuSourceType.Tencent)

    const episodes = await this.danmakuService.filter({
      provider: DanmakuSourceType.Tencent,
      seasonId: id,
    })

    if (!episodes.length) {
      throw new Error(
        'There must be at least one episode in the season to refresh'
      )
    }

    const episode = episodes[0]
    assertProviderType(episode, DanmakuSourceType.Tencent)

    await this.getPageDetails(season.providerIds.cid, '')
  }

  async getPageDetails(cid: string, vid: string) {
    this.logger.debug('Get page details', { cid, vid })

    const pageDetails = await tencent.getPageDetails(cid, vid)

    this.logger.debug('Get page details result', pageDetails)

    const foundSeason =
      pageDetails.module_list_datas[0]?.module_datas[0]?.item_data_lists
        ?.item_datas[0]

    if (foundSeason) {
      const season = await this.seasonService.upsert({
        provider: DanmakuSourceType.Tencent,
        providerConfigId: PROVIDER_TO_BUILTIN_ID.Tencent,
        title: stripHtml(foundSeason.item_params.title),
        type: foundSeason.item_type.toString(),
        imageUrl: foundSeason.item_params.new_pic_vt,
        providerIds: {
          cid: foundSeason.item_params['report.cid'],
        },
        episodeCount: foundSeason.item_params.episode_all,
        indexedId: foundSeason.item_params['report.cid'],
        schemaVersion: 1,
      })

      return {
        pageDetails,
        season,
      }
    }

    return { pageDetails }
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

  async getEpisodeByUrl(
    url: string
  ): Promise<WithSeason<TencentOf<EpisodeMeta>>> {
    const { pathname } = new URL(url)

    // https://v.qq.com/x/cover/mzc00200ztsl4to/m4100bardal.html
    const [, cid, vid] = pathname.match(/cover\/(.*)\/(.*)\.html/) ?? []

    if (!cid || !vid) throw new Error('Invalid tencent url')

    // get the name of the show
    const { season } = await this.getPageDetails(cid, vid)

    if (!season) throw new Error('Season not found')

    // get the name of the episode
    const episodes = await this.getEpisodes(season.id)
    const matchingEpisode = episodes.find(
      (episode) => episode.providerIds.vid === vid
    )
    if (!matchingEpisode) throw new Error('Episode not found')

    return matchingEpisode
  }
}
