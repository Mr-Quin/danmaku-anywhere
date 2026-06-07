import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useManifestLocale } from './useManifestLocale'

export const useManifestList = () => {
  const locale = useManifestLocale()
  return useQuery({
    queryFn: () => chromeRpcClient.providerListManifests({ locale }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestList(locale),
    refetchOnWindowFocus: false,
  })
}

export const useRefreshCatalog = () => {
  const queryClient = useQueryClient()
  const locale = useManifestLocale()
  return useMutation({
    mutationFn: () => chromeRpcClient.providerRefreshCatalog({ locale }),
    onSuccess: (res) => {
      queryClient.setQueryData(sourceQueryKeys.manifestList(locale), res)
      // A refresh re-checks the catalog, which can change the pending set.
      void queryClient.invalidateQueries({
        queryKey: sourceQueryKeys.pendingUpdates(),
      })
    },
  })
}
