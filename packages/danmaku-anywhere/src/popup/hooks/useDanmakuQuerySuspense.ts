import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'

export const useDanmakuQuerySuspense = (episodeId: number) => {
  const query = useSuspenseQuery({
    queryKey: ['getByEpisodeId', episodeId],
    queryFn: async () => {
      return await chromeRpcClient.danmakuGetByEpisodeId(episodeId)
    },
  })

  return query
}
