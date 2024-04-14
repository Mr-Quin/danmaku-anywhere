import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'

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
