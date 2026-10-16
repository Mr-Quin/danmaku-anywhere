import { useQuery } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useManifestLocale } from './useManifestLocale'

export const useManifestSpec = (
  manifestId: string,
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const locale = useManifestLocale()
  return useQuery({
    queryFn: () =>
      chromeRpcClient.providerGetManifestSpec({ manifestId, locale }),
    select: (res) => res.data,
    queryKey: sourceQueryKeys.manifestSpec(manifestId, locale),
    retry: false,
    enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
