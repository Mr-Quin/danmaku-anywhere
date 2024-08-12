import { useSuspenseQuery } from '@tanstack/react-query'

import type { MediaSearchMultiParamsData } from '@/common/anime/dto'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useMediaSearchMultiSuspense = (
  params: MediaSearchMultiParamsData
) => {
  return useSuspenseQuery({
    queryKey: ['media', 'search', 'multiple', params],
    queryFn: async () => {
      return chromeRpcClient.mediaSearchMultiple(params)
    },

    staleTime: Infinity,
    retry: false,
  })
}

useMediaSearchMultiSuspense.queryKey = (params: MediaSearchMultiParamsData) => [
  'media',
  'search',
  'multiple',
  params,
]
