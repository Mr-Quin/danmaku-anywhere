import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useSuspenseQuery } from '@tanstack/react-query'

export const usePlatformInfo = () => {
  const platformInfo = useSuspenseQuery({
    queryKey: controlQueryKeys.getPlatformInfo(),
    queryFn: () => chromeRpcClient.getPlatformInfo(),
  }).data.data

  return {
    platformInfo,
    isMobile: platformInfo.os === 'android',
  }
}
