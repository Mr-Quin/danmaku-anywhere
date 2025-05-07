import { customEpisodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'

export const useAllCustomEpisodesSuspense = () => {
  return useSuspenseQuery({
    queryKey: customEpisodeQueryKeys.filter({ all: true }),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterCustom({ all: true })
    },
    select: (data) => data.data,
  })
}

export const useAllCustomEpisodes = () => {
  return useQuery({
    queryKey: customEpisodeQueryKeys.filter({ all: true }),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterCustom({ all: true })
    },
    select: (data) => data.data,
  })
}
