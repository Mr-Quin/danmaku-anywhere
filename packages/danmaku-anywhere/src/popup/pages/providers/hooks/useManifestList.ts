import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useManifestList = () => {
  return useQuery({
    queryFn: () => chromeRpcClient.providerListManifests(),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestList(),
    refetchOnWindowFocus: false,
  })
}

export const useRefreshCatalog = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => chromeRpcClient.providerRefreshCatalog(),
    onSuccess: (res) => {
      queryClient.setQueryData(sourceQueryKeys.manifestList(), res)
    },
  })
}
