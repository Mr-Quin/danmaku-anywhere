import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useManifestLocale } from './useManifestLocale'

export const usePendingUpdates = () => {
  return useQuery({
    queryFn: () => chromeRpcClient.providerGetPendingUpdates(),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.pendingUpdates(),
    refetchOnWindowFocus: false,
  })
}

export const useApplyUpdates = () => {
  const queryClient = useQueryClient()
  const locale = useManifestLocale()
  return useMutation({
    mutationFn: (manifestIds: string[]) =>
      chromeRpcClient.providerApplyUpdates({ manifestIds }),
    onSuccess: () => {
      // Applying changes stored versions, so both the pending list and the
      // manifest list (used for the version subtitles) need to refetch.
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.pendingUpdates(),
      })
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.manifestList(locale),
      })
    },
  })
}
