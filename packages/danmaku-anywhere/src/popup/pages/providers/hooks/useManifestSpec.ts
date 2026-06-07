import { useQuery } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useManifestLocale } from './useManifestLocale'

export const useManifestSpec = (manifestId: string) => {
  const locale = useManifestLocale()
  return useQuery({
    queryFn: () =>
      chromeRpcClient.providerGetManifestSpec({ manifestId, locale }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestSpec(manifestId, locale),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
