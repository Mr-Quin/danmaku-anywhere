import { useQuery } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useManifestSpec = (manifestId: string) => {
  return useQuery({
    queryFn: () => chromeRpcClient.providerGetManifestSpec({ manifestId }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestSpec(manifestId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
