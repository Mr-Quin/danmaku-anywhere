import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useGetBilibiliEpisodes = (mediaId: number) => {
  return useSuspenseQuery({
    queryKey: ['media', 'bilibili', 'episodes', mediaId],
    queryFn: async () => {
      return chromeRpcClient.getBilibiliEpisode(mediaId)
    },
    staleTime: Infinity,
    retry: false,
  })
}

useGetBilibiliEpisodes.queryKey = (mediaId: number) => [
  'media',
  'bilibili',
  'episodes',
  mediaId,
]
