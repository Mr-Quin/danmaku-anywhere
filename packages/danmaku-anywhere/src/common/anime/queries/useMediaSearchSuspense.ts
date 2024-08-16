import { useSuspenseQuery } from '@tanstack/react-query'

import type { MediaSearchParamsData } from '@/common/anime/dto'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useMediaSearchSuspense = (params: MediaSearchParamsData) => {
  return useSuspenseQuery({
    queryKey: mediaKeys.search(params),
    queryFn: async () => {
      return chromeRpcClient.mediaSearch(params)
    },
    staleTime: Infinity,
    retry: false,
  })
}
