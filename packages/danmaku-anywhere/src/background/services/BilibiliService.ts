import type { BiliBiliSearchParams } from '@danmaku-anywhere/danmaku-provider/bilibili'
import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'

import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'

export class BilibiliService {
  private logger: typeof Logger

  private extensionOptionsService = extensionOptionsService

  constructor() {
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

  async search(searchParams: BiliBiliSearchParams) {
    this.logger.debug('Search bilibili', searchParams)
    const result = await bilibili.searchMedia(searchParams)
    this.logger.debug('Search result', result)
    return result
  }

  async getBangumiInfo(params: { seasonId?: number; episodeId?: number }) {
    this.logger.debug('Get bangumi info', params)
    const result = await bilibili.getBangumiInfo(params)
    this.logger.debug('Get bangumi info result', result)
    return result
  }

  async getDanmaku(cid: number, aid: number) {
    const pref = await this.extensionOptionsService.get()

    const { danmakuTypePreference } = pref.danmakuSources.bilibili

    if (danmakuTypePreference === 'xml') {
      return this.getDanmakuXml(cid)
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
