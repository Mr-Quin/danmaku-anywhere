import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useAnimeSearchSuspense = (
  searchParams: DanDanAnimeSearchAPIParams
) => {
  return useSuspenseQuery({
    queryKey: ['anime', 'search', searchParams],
    queryFn: async () => {
      return chromeRpcClient.animeSearch({
        anime: searchParams.anime,
        episode: searchParams.episode,
      })
    },
    staleTime: Infinity,
    retry: false,
  })
}

useAnimeSearchSuspense.queryKey = (
  searchParams: DanDanAnimeSearchAPIParams
) => ['anime', 'search', searchParams]
