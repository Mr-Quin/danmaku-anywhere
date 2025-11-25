import type {
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  TencentOf,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { TencentEpisodeListItem } from '@danmaku-anywhere/danmaku-provider/tencent'
import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { SeasonService } from '@/background/services/persistence/SeasonService'
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

export class TencentService implements IDanmakuProvider {
  private logger: typeof Logger

  readonly forProvider = DanmakuSourceType.Tencent

  constructor(
    private seasonService: SeasonService,
    private danmakuService: DanmakuService,
    _config: BuiltInTencentProvider
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

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    const kw = params.keyword
    this.logger.debug('Search tencent', kw)
    const result = await tencent.searchMedia({ query: kw })
    this.logger.debug('Search result', result)

    return result.map(TencentMapper.toSeasonInsert)
  }

  async getEpisodes(
    providerIds: TencentOf<Season>['providerIds']
  ): Promise<OmitSeasonId<TencentOf<EpisodeMeta>>[]> {
    this.logger.debug('Get episode', providerIds)

    const generator = tencent.listEpisodes({
      cid: providerIds.cid,
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

  /**
   * We need both the cid and vid to refresh the season info.
   * We can get the cid from the season info.
   * We can get the vid from the episode info, so there must be at least one episode in the season.
   */
  async refreshSeason(season: Season) {
    const id = season.id
    const seasonData = await this.seasonService.getByType(
      id,
      DanmakuSourceType.Tencent
    )

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

    await this.getPageDetails(seasonData.providerIds.cid, '')
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

  async getDanmaku(
    request: DanmakuFetchRequest
  ): Promise<WithSeason<TencentOf<Episode>>> {
    const { meta } = request
    assertProviderType(meta, DanmakuSourceType.Tencent)
    return this.saveEpisode(meta)
  }

  private async saveEpisode(
    meta: WithSeason<TencentOf<EpisodeMeta>>
  ): Promise<WithSeason<TencentOf<Episode>>> {
    const comments = await this.fetchDanmaku(meta.providerIds.vid)
    const saved = await this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
    })

    return {
      ...saved,
      season: meta.season,
    }
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
