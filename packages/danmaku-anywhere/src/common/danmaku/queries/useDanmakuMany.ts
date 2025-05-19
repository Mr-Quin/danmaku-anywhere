import { useQuery, useSuspenseQuery } from '@tanstack/react-query'

import type { EpisodeQueryFilter } from '@/common/danmaku/dto'
import { episodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useDanmakuManySuspense = (data: EpisodeQueryFilter) => {
  const query = useSuspenseQuery({
    queryKey: episodeQueryKeys.filter(data),
    queryFn: async () => {
      return await chromeRpcClient.episodeFilter(data)
    },
    select: (res) => res.data,
  })

  return query
}

export const useDanmakuManyLite = (data: EpisodeQueryFilter) => {
  const query = useQuery({
    queryKey: episodeQueryKeys.filterLite(data),
    queryFn: async () => {
      return await chromeRpcClient.episodeFilterLite(data)
    },
    select: (res) => res.data,
  })

  return query
}

export const useAllDanmakuSuspense = () => {
  const query = useSuspenseQuery({
    queryKey: episodeQueryKeys.filterLite({ all: true }),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterLite({ all: true })
    },
    select: (data) => data.data,
  })

  return query
}
