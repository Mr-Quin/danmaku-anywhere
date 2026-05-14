import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'
import type { DnrRuleSpec } from '@/background/netRequest/dnrTemplate'
import { runWithDnr } from '@/background/netRequest/runWithDnr'
import type { ILogger } from '@/common/Logger'
import type { IUrlParser, ParseUrlResult } from '../IDanmakuProvider'
import { TencentMapper } from './TencentMapper'

const defaultTencentSpec: DnrRuleSpec = {
  matchUrl: 'https://*.video.qq.com/',
  template: {
    Origin: 'https://v.qq.com',
    Referer: 'https://v.qq.com/',
  },
}

export class TencentService implements IUrlParser {
  private logger: ILogger

  constructor(logger: ILogger) {
    this.logger = logger.sub('[TencentService]')
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

  canParse(url: string): boolean {
    try {
      const { hostname } = new URL(url)
      return hostname === 'v.qq.com'
    } catch {
      return false
    }
  }

  async parseUrl(url: string): Promise<ParseUrlResult | null> {
    this.logger.debug('Parse tencent url', url)
    const { pathname } = new URL(url)

    // https://v.qq.com/x/cover/mzc00200ztsl4to/m4100bardal.html
    const [, cid, vid] = pathname.match(/cover\/(.*)\/(.*)\.html/) ?? []

    if (!cid || !vid) throw new Error('Invalid tencent url')

    return runWithDnr(defaultTencentSpec)(async () => {
      const pageDetailsResult = await tencent.getPageDetails(cid, vid)
      if (!pageDetailsResult.success) throw pageDetailsResult.error
      const foundSeason =
        pageDetailsResult.data?.module_list_datas[0]?.module_datas[0]
          ?.item_data_lists?.item_datas[0]
      if (!foundSeason) throw new Error('Season not found')
      const seasonInsert = TencentMapper.pageDetailsToSeasonInsert(foundSeason)

      const generator = tencent.listEpisodes({ cid, vid: '' })
      const episodes: tencent.TencentEpisodeListItem[] = []
      for await (const itemsResult of generator) {
        if (!itemsResult.success) throw itemsResult.error
        episodes.push(...itemsResult.data)
      }
      const matchingEpisode = episodes.find((e) => e.vid === vid)
      if (!matchingEpisode) throw new Error('Episode not found')

      return {
        episodeMeta: TencentMapper.toEpisodeMeta(matchingEpisode),
        seasonInsert,
      }
    })
  }
}
