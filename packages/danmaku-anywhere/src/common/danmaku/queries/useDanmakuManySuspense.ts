import { useSuspenseQuery } from '@tanstack/react-query'

import type { EpisodeQueryFilter } from '@/common/danmaku/dto'
import { episodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useDanmakuManySuspense = (data: EpisodeQueryFilter) => {
  const query = useSuspenseQuery({
    queryKey: episodeQueryKeys.many(data),
    queryFn: async () => {
      return await chromeRpcClient.episodeFilter(data)
    },
    select: (res) => res.data,
  })

  return query
}
