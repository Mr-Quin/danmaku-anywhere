import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { BiliBiliSearchParams } from '@danmaku-anywhere/danmaku-provider/bilibili'

import { Logger } from '@/common/Logger'

export class BilibiliService {
  private logger: typeof Logger
  // private extensionOptionsService = extensionOptionsService

  constructor() {
    this.logger = Logger.sub('[BilibiliService]')
  }

  async search(searchParams: BiliBiliSearchParams) {
    return bilibili.searchMedia(searchParams)
  }

  async getBangumiInfo(mediaId: number) {
    return bilibili.getBangumiInfo(mediaId)
  }

  async getDanmaku(cid: number, aid: number) {
    aid //?
    return this.getDanmakuXml(cid)
  }

  private async getDanmakuXml(cid: number) {
    return bilibili.getDanmakuXml(cid)
  }

  private async getDanmakuProto() {
    return bilibili.getDanmakuProto()
  }
}
