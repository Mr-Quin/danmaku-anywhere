import { useQuery } from '@tanstack/react-query'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { sourceQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

// Some sources answer a logged-out search with nothing at all, which reads as
// "no such show". The login probe tells that apart from a real empty result,
// so it only runs once a search has come back empty.
export function useSignInPrompt(
  provider: ProviderConfig | undefined,
  resultEmpty: boolean
) {
  const manifestId = provider?.manifestId ?? ''
  const query = useQuery({
    queryKey: sourceQueryKeys.loginStatus(manifestId),
    queryFn: () => chromeRpcClient.providerProbeLogin({ manifestId }),
    select: (res) => res.data,
    enabled: !!provider && resultEmpty,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const needsSignIn =
    resultEmpty && query.data?.hasLoginProbe === true && query.data.ok === false

  return {
    needsSignIn,
    signInUrl: query.data?.cookieSet?.url,
    recheck: () => {
      void query.refetch()
    },
  }
}
