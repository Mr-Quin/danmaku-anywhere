import { useQuery } from '@tanstack/react-query'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useProviderWarning = (config: ProviderConfig) => {
  const query = useQuery({
    queryFn: () =>
      chromeRpcClient.providerProbeLogin({ manifestId: config.manifestId }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.loginStatus(config.manifestId),
    enabled: config.enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const status = query.data

  return {
    showWarning: status?.hasLoginProbe === true && status.ok === false,
    cookieSet: status?.cookieSet,
    isLoading: query.isLoading,
  }
}
