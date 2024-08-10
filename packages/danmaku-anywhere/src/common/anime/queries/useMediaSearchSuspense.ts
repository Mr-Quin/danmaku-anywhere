import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { MediaSearchParamsData } from '@/common/anime/dto'

export const useMediaSearchSuspense = (params: MediaSearchParamsData) => {
  return useSuspenseQuery({
    queryKey: ['media', 'search', params],
    queryFn: async () => {
      return chromeRpcClient.mediaSearch(params)
    },

    staleTime: Infinity,
    retry: false,
  })
}

useMediaSearchSuspense.queryKey = (params: MediaSearchParamsData) => [
  'media',
  'search',
  params,
]
