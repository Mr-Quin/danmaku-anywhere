import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useBilibiliLoginStatus } from './useBilibiliLoginStatus'
import { useTencentCookieStatus } from './useTencentCookieStatus'

export const useProviderWarning = (config: ProviderConfig) => {
  const bilibiliStatus = useBilibiliLoginStatus(config)
  const tencentStatus = useTencentCookieStatus(config)

  if (config.impl === DanmakuSourceType.Bilibili && config.isBuiltIn) {
    return {
      showWarning: !bilibiliStatus.isLoggedIn,
      isLoading: bilibiliStatus.isLoading,
      warningType: 'bilibili' as const,
    }
  }

  if (config.impl === DanmakuSourceType.Tencent && config.isBuiltIn) {
    return {
      showWarning: !tencentStatus.hasCookies,
      isLoading: tencentStatus.isLoading,
      warningType: 'tencent' as const,
    }
  }

  return {
    showWarning: false,
    isLoading: false,
    warningType: null,
  }
}
