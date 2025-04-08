import { useSuspenseQuery } from '@tanstack/react-query'

import type { QueryEpisodeFilter } from '@/common/danmaku/dto'
import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useDanmakuSuspense = (data: QueryEpisodeFilter) => {
  const query = useSuspenseQuery({
    queryKey: danmakuQueryKeys.one(data),
    queryFn: async () => {
      return await chromeRpcClient.episodeGetOne(data)
    },
    select: (res) => res.data,
  })

  return query
}
