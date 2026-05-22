import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { ILogger } from '@/common/Logger'
import type { IUrlParser, ParseUrlResult } from '../IDanmakuProvider'
import { BilibiliMapper } from './BilibiliMapper'

export class BilibiliService implements IUrlParser {
  private logger: ILogger

  constructor(logger: ILogger) {
    this.logger = logger.sub('[BilibiliService]')
  }

  static async setCookies(logger: ILogger) {
    logger.sub('[BilibiliService]').debug('Setting bilibili cookies')
    await bilibili.setCookies()
  }

  static async getLoginStatus(logger: ILogger) {
    logger.sub('[BilibiliService]').debug('Get bilibili login status')
    const result = await bilibili.getCurrentUser()
    if (!result.success) throw result.error
    return result.data
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

    const seasonInfoResult = await bilibili.getBangumiInfo({
      seasonId: ssid ? Number.parseInt(ssid) : undefined,
      episodeId: epid ? Number.parseInt(epid) : undefined,
    })

    if (!seasonInfoResult.success) throw seasonInfoResult.error
    const seasonInfo = seasonInfoResult.data

    // if using season id, get the first episode
    const episode = epid
      ? seasonInfo.episodes.find((e) => e.id === Number.parseInt(epid))
      : seasonInfo.episodes[0]

    if (!episode) throw new Error('Episode not found')

    return {
      episodeMeta: BilibiliMapper.toEpisode(episode),
      seasonInsert: BilibiliMapper.bangumiInfoToSeasonInsert(seasonInfo),
    }
  }
}
