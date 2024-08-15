import { useSuspenseQuery } from '@tanstack/react-query'

import type { GetEpisodeDto } from '@/common/anime/dto'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useGetEpisodes = (data: GetEpisodeDto) => {
  return useSuspenseQuery({
    queryKey: ['media', 'episodes', data.provider, data.seasonId],
    queryFn: async () => {
      return chromeRpcClient.episodesGet(data)
    },
    staleTime: Infinity,
    retry: false,
  })
}

useGetEpisodes.queryKey = (data: GetEpisodeDto) => [
  'media',
  'episodes',
  data.provider,
  data.seasonId,
]
