import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'

export const useDanmakuQuerySuspense = (episodeId: number) => {
  const query = useSuspenseQuery({
    queryKey: ['danmaku', 'getByEpisodeId', episodeId],
    queryFn: async () => {
      return await chromeRpcClient.danmakuGetByEpisodeId(episodeId)
    },
  })

  return query
}

useDanmakuQuerySuspense.queryKey = (episodeId: number) => [
  'danmaku',
  'getByEpisodeId',
  episodeId,
]