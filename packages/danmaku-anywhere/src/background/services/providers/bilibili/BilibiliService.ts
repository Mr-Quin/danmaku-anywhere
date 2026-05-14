import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { ILogger } from '@/common/Logger'

// Bilibili cookie + login statics. Called from RpcManager for the popup's
// "Set Cookies" / "Login Status" buttons. Phase 2's login-probe primitive
// (DA-485) replaces these and deletes this class.
export class BilibiliService {
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
}
