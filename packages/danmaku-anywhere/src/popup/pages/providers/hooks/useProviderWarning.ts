import { useQuery } from '@tanstack/react-query'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

/**
 * Generic per-provider warning state. Reads the manifest's loginProbe
 * declaration via providerGetSpec; if declared, runs the probe via
 * providerProbeLogin. Show the warning iff the probe explicitly returned
 * false (logged-out / cookies-missing); null means the manifest has no
 * probe and we say nothing.
 *
 * The associated cookieSet (URL + title) comes from the manifest too so
 * the warning icon's "go fix this" affordance is fully data-driven.
 */
export function useProviderWarning(config: ProviderConfig) {
  const spec = useQuery({
    queryFn: async () => {
      const res = await chromeRpcClient.providerGetSpec({
        manifestId: config.manifestId,
      })
      return res.data
    },
    queryKey: sourceQueryKeys.manifestSpec(config.manifestId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const probe = useQuery({
    queryFn: async () => {
      const res = await chromeRpcClient.providerProbeLogin({
        manifestId: config.manifestId,
      })
      return res.data
    },
    queryKey: sourceQueryKeys.providerProbe(config.manifestId),
    enabled: config.isBuiltIn && spec.data?.hasLoginProbe === true,
    refetchOnWindowFocus: false,
  })

  return {
    showWarning: probe.data === false,
    isLoading: spec.isLoading || probe.isLoading,
    cookieSet: spec.data?.cookieSet,
  }
}
