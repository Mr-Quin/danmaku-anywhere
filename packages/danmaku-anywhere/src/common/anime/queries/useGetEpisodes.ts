import { useSuspenseQuery } from '@tanstack/react-query'

import type { GetEpisodeDto, GetEpisodeResult } from '@/common/anime/dto'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useGetEpisodes = <T extends GetEpisodeDto>(data: T) => {
  return useSuspenseQuery({
    queryKey: mediaKeys.episodes(data),
    queryFn: async () => {
      const result = await chromeRpcClient.episodesGet(data)
      return result as Extract<GetEpisodeResult, { provider: T['provider'] }>
    },
    staleTime: Infinity,
    retry: false,
  })
}
