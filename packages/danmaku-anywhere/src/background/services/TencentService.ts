import type { TencentEpisodeListItem } from '@danmaku-anywhere/danmaku-provider/tencent'
import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'

import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'

export class TencentService {
  private logger: typeof Logger

  private extensionOptionsService = extensionOptionsService

  constructor() {
    this.logger = Logger.sub('[TencentService]')
  }

  async setCookies() {
    this.logger.debug('Setting tencent cookies')
    await tencent.setCookies()
  }

  async search(keyword: string) {
    this.logger.debug('Search tencent', keyword)
    const result = await tencent.searchMedia({ query: keyword })
    this.logger.debug('Search result', result)
    return result
  }

  async getEpisodes(cid: string, vid?: string) {
    this.logger.debug('Get episode', { cid, vid })

    const generator = tencent.listEpisodes({ cid, vid: vid ?? '' })

    const result: TencentEpisodeListItem[][] = []
    for await (const items of generator) {
      result.push(items)
    }

    this.logger.debug('Get episode result', result)
    return result.flat()
  }

  async getPageDetails(cid: string, vid: string) {
    this.logger.debug('Get page details', { cid, vid })

    const result = await tencent.getPageDetails(cid, vid)

    this.logger.debug('Get page details result', result)

    return result
  }

  async getDanmaku(vid: string) {
    // const pref = await this.extensionOptionsService.get()

    return await tencent.getDanmaku(vid)
  }
}
