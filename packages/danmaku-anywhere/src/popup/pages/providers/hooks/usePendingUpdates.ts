import { useMutation, useQuery } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const usePendingUpdates = () => {
  return useQuery({
    queryFn: () => chromeRpcClient.providerGetPendingUpdates(),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.pendingUpdates(),
    refetchOnWindowFocus: false,
    // The background already retries the catalog index fetch once; client
    // retries would multiply that during an outage.
    retry: false,
  })
}

export const useApplyUpdates = () => {
  return useMutation({
    mutationFn: (manifestIds: string[]) =>
      chromeRpcClient.providerApplyUpdates({ manifestIds }),
  })
}
