import { useQuery } from '@tanstack/react-query'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useBilibiliLoginStatus = (config: ProviderConfig) => {
  const isBilibili = config.type === 'Bilibili'

  const query = useQuery({
    queryFn: () => chromeRpcClient.bilibiliGetLoginStatus(),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.bilibili(),
    enabled: isBilibili,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  return {
    isLoggedIn: query.data?.isLogin ?? true,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
