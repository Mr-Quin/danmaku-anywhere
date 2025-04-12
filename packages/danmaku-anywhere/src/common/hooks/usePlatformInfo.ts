import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useSuspenseQuery } from '@tanstack/react-query'

export const usePlatformInfo = () => {
  return useSuspenseQuery({
    queryKey: controlQueryKeys.getPlatformInfo(),
    queryFn: () => chromeRpcClient.getPlatformInfo(),
  }).data.data
}
