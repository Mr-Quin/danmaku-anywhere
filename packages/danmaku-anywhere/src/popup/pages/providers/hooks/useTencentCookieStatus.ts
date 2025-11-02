import { useQuery } from '@tanstack/react-query'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useTencentCookieStatus = (config: ProviderConfig) => {
  const isTencent = config.type === 'Tencent'

  const query = useQuery({
    queryFn: () => chromeRpcClient.tencentTestCookies(),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.tencent(),
    enabled: isTencent,
    refetchOnWindowFocus: false,
  })

  return {
    hasCookies: query.data ?? true,
    isLoading: query.isLoading,
  }
}
