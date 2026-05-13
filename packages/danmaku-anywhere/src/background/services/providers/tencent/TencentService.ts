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
import type { DnrRuleSpec } from '@/background/netRequest/dnrTemplate'
import { runWithDnr } from '@/background/netRequest/runWithDnr'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { assertProviderType } from '@/common/danmaku/utils'
import type { ILogger } from '@/common/Logger'
import type { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { BuiltInTencentProvider } from '@/common/options/providerConfig/schema'
import { findEpisodeByNumber } from '../common/findEpisodeByNumber'
import type {
  IDanmakuProvider,
  OmitSeasonId,
  ParseUrlResult,
  SeasonSearchParams,
} from '../IDanmakuProvider'
import { getTencentRunner } from '../manifestRunners'
import { TencentMapper } from './TencentMapper'

const defaultTencentSpec: DnrRuleSpec = {
  matchUrl: 'https://*.video.qq.com/',
  template: {
    Origin: 'https://v.qq.com',
    Referer: 'https://v.qq.com/',
  },
}

const searchTencentSpec: DnrRuleSpec = {
  matchUrl: 'https://*.video.qq.com/',
  template: {
    Origin: 'https://v.qq.com',
    Referer: 'https://v.qq.com/x/search/?q={keyword}&stag=&smartbox_ab=',
  },
}

export class TencentService implements IDanmakuProvider {
  private logger: ILogger

  readonly forProvider = DanmakuSourceType.Tencent

  constructor(
    _config: BuiltInTencentProvider,
    logger: ILogger,
    private readonly extensionOptionsService: ExtensionOptionsService
  ) {
    this.logger = logger.sub('[TencentService]')
  }

  private async useManifest(): Promise<boolean> {
    const opts = await this.extensionOptionsService.get()
    return opts.useManifest
  }

  // test if the cookies are working
  static async testCookies(logger: ILogger) {
    const log = logger.sub('[TencentService]')
    log.debug('Testing tencent cookies')
    try {
      return await runWithDnr(defaultTencentSpec)(async () => {
        const result = await tencent.getPageDetails(
          'mzc00200xf3rir6',
          'i0046sewh4r'
        )
        if (!result.success) throw result.error
        return true
      })
    } catch (e) {
      if (e instanceof tencent.TencentApiException) {
        if (e.cookie) {
          log.debug('Request rejected because of lack of cookies', e)
        }
      } else {
        log.error('Test tencent cookies test failed', e)
      }
      return false
    }
  }

  async search(params: SeasonSearchParams): Promise<SeasonInsert[]> {
    const kw = params.keyword
    this.logger.debug('Search tencent', kw)

    if (await this.useManifest()) {
      const runner = getTencentRunner()
      const results = (await runner.runSearch({ q: kw })) as Array<{
        providerIds: { cid: string }
        title: string
        type: string
        imageUrl?: string
        episodeCount?: number
        year?: number
      }>
      this.logger.debug('Manifest search result', results)
      return results.map(TencentMapper.manifestSearchToSeasonInsert)
    }

    return runWithDnr(searchTencentSpec, {
      keyword: encodeURIComponent(kw),
    })(async () => {
      const result = await tencent.searchMedia({ query: kw })
      this.logger.debug('Search result', result)

      if (!result.success) throw result.error

      return result.data.map(TencentMapper.toSeasonInsert)
    })
  }

  async findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null> {
    assertProviderType(season, DanmakuSourceType.Tencent)

    return runWithDnr(defaultTencentSpec)(async () => {
      const episodes = await this.getEpisodes(season.providerIds)

      if (episodes.length === 0) {
        throw new Error(`No episodes found for season: ${season.title}`)
      }

      const episode = findEpisodeByNumber(episodes, episodeNumber)

      if (!episode) {
        return null
      }

      assertProviderType(episode, DanmakuSourceType.Tencent)

      return {
        ...episode,
        seasonId: season.id,
        season,
      }
    })
  }

  async getEpisodes(
    seasonRemoteIds: TencentOf<Season>['providerIds']
  ): Promise<OmitSeasonId<TencentOf<EpisodeMeta>>[]> {
    this.logger.debug('Get episode', seasonRemoteIds)

    if (await this.useManifest()) {
      const runner = getTencentRunner()
      const results = (await runner.runEpisodes({
        cid: seasonRemoteIds.cid,
      })) as Array<{
        providerIds: { vid: string; cid: string }
        title: string
        alternativeTitle?: string[]
        imageUrl?: string
      }>
      this.logger.debug('Manifest episodes result', results)
      return results.map(TencentMapper.manifestEpisodeToEpisodeMeta)
    }

    return runWithDnr(defaultTencentSpec)(async () => {
      const generator = tencent.listEpisodes({
        cid: seasonRemoteIds.cid,
        vid: '',
      })

      const result: TencentEpisodeListItem[][] = []
      for await (const itemsResult of generator) {
        if (!itemsResult.success) throw itemsResult.error
        result.push(itemsResult.data)
      }

      this.logger.debug('Get episode result', result)

      return result.flat().map((item) => {
        return TencentMapper.toEpisodeMeta(item)
      })
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

    return runWithDnr(defaultTencentSpec)(async () => {
      const pageDetailsResult = await tencent.getPageDetails(cid, vid)

      this.logger.debug('Get page details result', pageDetailsResult)

      if (!pageDetailsResult.success) throw pageDetailsResult.error
      const pageDetails = pageDetailsResult.data

      const foundSeason =
        pageDetails?.module_list_datas[0]?.module_datas[0]?.item_data_lists
          ?.item_datas[0]

      if (foundSeason) {
        return {
          pageDetails,
          season: TencentMapper.pageDetailsToSeasonInsert(foundSeason),
        }
      }

      return { pageDetails }
    })
  }

  async getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]> {
    const { meta } = request

    assertProviderType(meta, DanmakuSourceType.Tencent)

    return this.fetchDanmaku(meta.providerIds.vid)
  }

  private async fetchDanmaku(vid: string) {
    if (await this.useManifest()) {
      const runner = getTencentRunner()
      const comments = (await runner.runDanmaku({ vid })) as CommentEntity[]
      this.logger.debug('Manifest danmaku fetched', comments.length)
      return comments
    }
    return runWithDnr(defaultTencentSpec)(async () => {
      const result = await tencent.getDanmaku(vid)
      if (!result.success) throw result.error
      return result.data
    })
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
