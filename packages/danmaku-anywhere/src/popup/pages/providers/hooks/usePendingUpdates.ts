import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (manifestIds: string[]) =>
      chromeRpcClient.providerApplyUpdates({ manifestIds }),
    onSettled: () => {
      // Applying changes stored versions, so both the pending list and the
      // manifest list (used for the version subtitles) need to refetch. A
      // failed apply can still have persisted some of the requested manifests,
      // so refetch on error too. The version is locale-independent, so
      // invalidate every locale's list.
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.pendingUpdates(),
      })
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.manifestList(),
      })
    },
  })
}
