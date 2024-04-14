import { useQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'

export const useDanmakuQuery = (episodeId?: number) => {
  const query = useQuery({
    queryKey: ['danmaku', 'getByEpisodeId', episodeId],
    queryFn: async () => {
      const res = await chromeRpcClient.danmakuGetByEpisodeId(episodeId!)
      return res
    },
    enabled: episodeId !== undefined,
  })

  return query
}

useDanmakuQuery.queryKey = (episodeId: number) => [
  'danmaku',
  'getByEpisodeId',
  episodeId,
]
