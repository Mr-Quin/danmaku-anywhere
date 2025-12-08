import type {
  CommentEntity,
  EpisodeMeta,
  Season,
  SeasonInsert,
  TencentOf,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { TencentEpisodeListItem } from '@danmaku-anywhere/danmaku-provider/tencent'
import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type { BuiltInTencentProvider } from '@/common/options/providerConfig/schema'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  ParseUrlResult,
  SeasonSearchParams,
} from '../IDanmakuProvider'
import { TencentMapper } from './TencentMapper'
import { findTencentEpisodeInList } from './episodeMatching'

export class TencentService implements IDanmakuProvider {
  private logger: typeof Logger

  readonly forProvider = DanmakuSourceType.Tencent

  constructor(_config: BuiltInTencentProvider) {
    this.logger = Logger.sub('[TencentService]')
  }

  // test if the cookies are working
  static async testCookies() {
    const logger = Logger.sub('[TencentService]')
    logger.debug('Testing tencent cookies')
    try {
      await tencent.getPageDetails('mzc00200xf3rir6', 'i0046sewh4r')
      return true
    } catch (e) {
      if (e instanceof tencent.TencentApiException) {
        if (e.cookie) {
          logger.debug('Request rejected because of lack of cookies', e)
        }
      } else {
        logger.error('Test tencent cookies test failed', e)
      }
      return false
    }
  }

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    const kw = params.keyword
    this.logger.debug('Search tencent', kw)
    const result = await tencent.searchMedia({ query: kw })
    this.logger.debug('Search result', result)

    return result.map(TencentMapper.toSeasonInsert)
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    assertProviderType(season, DanmakuSourceType.Tencent)

    const episodes = await this.getEpisodes(season.providerIds)

    if (episodes.length === 0) {
      throw new Error(`No episodes found for season: ${season.title}`)
    }

    const episode = findTencentEpisodeInList(episodes, episodeNumber)

    if (!episode) {
      return null
    }

    assertProviderType(episode, DanmakuSourceType.Tencent)

    return {
      ...episode,
      seasonId: season.id,
      season,
    }
  }

  async getEpisodes(
    seasonRemoteIds: TencentOf<Season>['providerIds']
  ): Promise<OmitSeasonId<TencentOf<EpisodeMeta>>[]> {
    this.logger.debug('Get episode', seasonRemoteIds)

    const generator = tencent.listEpisodes({
      cid: seasonRemoteIds.cid,
      vid: '',
    })

    const result: TencentEpisodeListItem[][] = []
    for await (const items of generator) {
      result.push(items)
    }

    this.logger.debug('Get episode result', result)

    return result.flat().map((item) => {
      return TencentMapper.toEpisodeMeta(item)
    })
  }

  async getSeason(
    seasonRemoteIds: TencentOf<Season>['providerIds']
  ): Promise<SeasonInsert | null> {
    const { season } = await this.getPageDetails(seasonRemoteIds.cid, '')
    if (!season) {
      return null
    }
    return season
  }

  async getPageDetails(cid: string, vid: string) {
    this.logger.debug('Get page details', { cid, vid })

    const pageDetails = await tencent.getPageDetails(cid, vid)

    this.logger.debug('Get page details result', pageDetails)

    const foundSeason =
      pageDetails.module_list_datas[0]?.module_datas[0]?.item_data_lists
        ?.item_datas[0]

    if (foundSeason) {
      return {
        pageDetails,
        season: TencentMapper.pageDetailsToSeasonInsert(foundSeason),
      }
    }

    return { pageDetails }
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<CommentEntity[]> {
    const { meta } = request

    assertProviderType(meta, DanmakuSourceType.Tencent)

    return this.getDanmakuInternal(meta)
  }

  private async getDanmakuInternal(
    meta: WithSeason<TencentOf<EpisodeMeta>>
  ): Promise<CommentEntity[]> {
    const comments = await this.fetchDanmaku(meta.providerIds.vid)
    return comments
  }

  private async fetchDanmaku(vid: string) {
    return await tencent.getDanmaku(vid)
  }

  canParse(url: string): boolean {
    try {
      const { hostname } = new URL(url)
      return hostname === 'v.qq.com'
    } catch {
      return false
    }
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    const { pathname } = new URL(url)

    // https://v.qq.com/x/cover/mzc00200ztsl4to/m4100bardal.html
    const [, cid, vid] = pathname.match(/cover\/(.*)\/(.*)\.html/) ?? []

    if (!cid || !vid) throw new Error('Invalid tencent url')

    // get the name of the show
    const { season } = await this.getPageDetails(cid, vid)

    if (!season) throw new Error('Season not found')

    // get the name of the episode
    const episodes = await this.getEpisodes(season.providerIds)
    const matchingEpisode = episodes.find(
      (episode) => episode.providerIds.vid === vid
    )
    if (!matchingEpisode) throw new Error('Episode not found')

    return {
      episodeMeta: matchingEpisode,
      seasonInsert: season,
    }
  }
}
