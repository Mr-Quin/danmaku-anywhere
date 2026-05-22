import * as tencent from '@danmaku-anywhere/danmaku-provider/tencent'
import type { DnrRuleSpec } from '@/background/netRequest/dnrTemplate'
import { runWithDnr } from '@/background/netRequest/runWithDnr'
import type { ILogger } from '@/common/Logger'

const defaultTencentSpec: DnrRuleSpec = {
  matchUrl: 'https://*.video.qq.com/',
  template: {
    Origin: 'https://v.qq.com',
    Referer: 'https://v.qq.com/',
  },
}

// Tencent cookie-probe static. Called from RpcManager for the popup's
// cookie status indicator. Phase 2's login-probe primitive (DA-485)
// replaces this and deletes the class.
export class TencentService {
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
}
