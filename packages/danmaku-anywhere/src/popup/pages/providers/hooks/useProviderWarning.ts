import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { useQuery } from '@tanstack/react-query'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useProviderWarning = (config: ProviderConfig) => {
  // legacy:maccms has no manifest to probe.
  const canProbe = config.enabled && config.manifestId !== LEGACY_MACCMS_ID

  const query = useQuery({
    queryFn: () =>
      chromeRpcClient.providerProbeLogin({ manifestId: config.manifestId }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.loginStatus(config.manifestId),
    enabled: canProbe,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const status = query.data

  return {
    // Gate on config.enabled: react-query keeps the last data for a disabled
    // provider, which would otherwise leave a stale warning showing.
    showWarning:
      config.enabled && status?.hasLoginProbe === true && status.ok === false,
    cookieSet: status?.cookieSet,
    isLoading: query.isLoading,
  }
}
