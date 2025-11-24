import type {
  Episode,
  EpisodeMeta,
  Season,
  TencentOf,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { TencentEpisodeListItem } from '@danmaku-anywhere/danmaku-provider/tencent'
import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'
import type { DanmakuService } from '@/background/services/DanmakuService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import type { IDanmakuProvider } from '../IDanmakuProvider'
import { TencentMapper } from './TencentMapper'

export class TencentService implements IDanmakuProvider {
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

  async search(
    keyword: string | { keyword: string }
  ): Promise<TencentOf<Season>[]> {
    const kw = typeof keyword === 'string' ? keyword : keyword.keyword
    this.logger.debug('Search tencent', kw)
    const result = await tencent.searchMedia({ query: kw })
    this.logger.debug('Search result', result)

    const seasons = result.map(TencentMapper.toSeasonInsert)
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
      return TencentMapper.toEpisodeMeta(item, season)
    })
  }

  /**
   * We need both the cid and vid to refresh the season info.
   * We can get the cid from the season info.
   * We can get the vid from the episode info, so there must be at least one episode in the season.
   */
  async refreshSeason(season: Season, _config: ProviderConfig) {
    const id = season.id
    const seasonData = await this.seasonService.mustGetById(id)
    assertProviderType(seasonData, DanmakuSourceType.Tencent)

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
      const season = await this.seasonService.upsert(
        TencentMapper.pageDetailsToSeasonInsert(foundSeason)
      )

      return {
        pageDetails,
        season,
      }
    }

    return { pageDetails }
  }

  async getDanmaku(
    request: DanmakuFetchRequest,
    config: ProviderConfig
  ): Promise<WithSeason<TencentOf<Episode>>> {
    assertProviderConfigImpl(config, DanmakuSourceType.Tencent)

    if (request.type === 'by-id') {
      const season = await this.seasonService.mustGetById(request.seasonId)
      assertProviderType(season, DanmakuSourceType.Tencent)
      const episodes = await this.getEpisodes(request.seasonId)
      const episode = episodes.find(
        (e) => e.providerIds.vid === request.episodeId.toString()
      )
      if (!episode) {
        throw new Error('Episode not found')
      }
      const result = await this.saveEpisode(episode)
      return {
        ...result,
        season,
      }
    }

    const { meta } = request
    assertProviderType(meta, DanmakuSourceType.Tencent)
    const result = await this.saveEpisode(meta)
    return {
      ...result,
      season: meta.season,
    }
  }

  async saveEpisode(meta: TencentOf<EpisodeMeta>) {
    const comments = await this.fetchDanmaku(meta.providerIds.vid)
    return this.danmakuService.upsert({
      ...meta,
      comments,
      commentCount: comments.length,
    })
  }

  async fetchDanmaku(vid: string) {
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

  async parseUrl(
    url: string
  ): Promise<WithSeason<TencentOf<EpisodeMeta>> | null> {
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
