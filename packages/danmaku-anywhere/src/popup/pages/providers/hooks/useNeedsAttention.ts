import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { useQueries } from '@tanstack/react-query'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { ProviderCookieSet } from '@/common/rpcClient/background/types'

export interface AttentionItem {
  config: ProviderConfig
  cookieSet?: ProviderCookieSet
}

// Derives the login-required set the same way useProviderWarning does, but for
// the whole installed list at once so the callout can list every source that
// needs a sign-in.
export const useNeedsAttention = (
  configs: ProviderConfig[]
): AttentionItem[] => {
  // Login state is per manifest (host), so probe each manifestId once even when
  // it has several instances, and surface one callout row per manifest.
  const seen = new Set<string>()
  const probeable = configs.filter((config) => {
    if (!config.enabled || config.manifestId === LEGACY_MACCMS_ID) {
      return false
    }
    if (seen.has(config.manifestId)) {
      return false
    }
    seen.add(config.manifestId)
    return true
  })

  const results = useQueries({
    queries: probeable.map((config) => ({
      queryKey: sourceQueryKeys.loginStatus(config.manifestId),
      queryFn: () =>
        chromeRpcClient.providerProbeLogin({ manifestId: config.manifestId }),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    })),
  })

  const attention: AttentionItem[] = []
  probeable.forEach((config, index) => {
    const status = results[index]?.data?.data
    if (status?.hasLoginProbe === true && status.ok === false) {
      attention.push({ config, cookieSet: status.cookieSet })
    }
  })
  return attention
}
