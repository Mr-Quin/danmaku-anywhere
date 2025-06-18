import { useSuspenseQuery } from '@tanstack/react-query'
import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const usePlatformInfo = () => {
  const platformInfo = useSuspenseQuery({
    queryKey: controlQueryKeys.getPlatformInfo(),
    queryFn: () => chromeRpcClient.getPlatformInfo(),
    staleTime: Number.POSITIVE_INFINITY,
  }).data.data

  return {
    platformInfo,
    isMobile: platformInfo.os === 'android',
  }
}
