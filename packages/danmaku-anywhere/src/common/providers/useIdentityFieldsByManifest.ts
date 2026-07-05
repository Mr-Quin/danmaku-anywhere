import { useSuspenseQuery } from '@tanstack/react-query'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { IdentityFieldsByManifest } from './resolveSeasonConfig'

// The identityFields declaration of every registered manifest, for namespace
// derivation on the UI side (resolveSeasonConfig / computeNamespaceKey).
export function useIdentityFieldsByManifest(): IdentityFieldsByManifest {
  const { data } = useSuspenseQuery({
    queryKey: sourceQueryKeys.manifestList(),
    queryFn: () => chromeRpcClient.providerListManifests({}),
    select: (res) =>
      Object.fromEntries(
        res.data.manifests.map((manifest) => [
          manifest.id,
          manifest.identityFields,
        ])
      ),
    staleTime: 1000 * 60 * 5,
  })
  return data
}
