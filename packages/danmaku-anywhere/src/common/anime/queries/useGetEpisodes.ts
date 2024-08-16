import { useSuspenseQuery } from '@tanstack/react-query'

import type { GetEpisodeDto } from '@/common/anime/dto'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useGetEpisodes = (data: GetEpisodeDto) => {
  return useSuspenseQuery({
    queryKey: mediaKeys.episodes(data),
    queryFn: async () => {
      return chromeRpcClient.episodesGet(data)
    },
    staleTime: Infinity,
    retry: false,
  })
}
