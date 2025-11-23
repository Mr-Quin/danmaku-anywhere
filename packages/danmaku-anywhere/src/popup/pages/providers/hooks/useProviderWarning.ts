import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useBilibiliLoginStatus } from './useBilibiliLoginStatus'
import { useTencentCookieStatus } from './useTencentCookieStatus'

export const useProviderWarning = (config: ProviderConfig) => {
  const bilibiliStatus = useBilibiliLoginStatus(config)
  const tencentStatus = useTencentCookieStatus(config)

  if (config.type === 'Bilibili') {
    return {
      showWarning: !bilibiliStatus.isLoggedIn,
      isLoading: bilibiliStatus.isLoading,
      warningType: 'bilibili' as const,
    }
  }

  if (config.type === 'Tencent') {
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
