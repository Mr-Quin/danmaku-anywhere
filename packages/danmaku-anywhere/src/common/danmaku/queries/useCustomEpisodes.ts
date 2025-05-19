import type { CustomEpisodeQueryFilter } from '@/common/danmaku/dto'
import { customEpisodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'

export const useCustomEpisodeSuspense = (filter: CustomEpisodeQueryFilter) => {
  return useSuspenseQuery({
    queryKey: customEpisodeQueryKeys.filter(filter),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterCustom(filter)
    },
    select: (data) => data.data,
  })
}

export const useCustomEpisode = (filter: CustomEpisodeQueryFilter) => {
  return useQuery({
    queryKey: customEpisodeQueryKeys.filter(filter),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterCustom(filter)
    },
    select: (data) => data.data,
  })
}

export const useCustomEpisodeLite = (filter: CustomEpisodeQueryFilter) => {
  return useQuery({
    queryKey: customEpisodeQueryKeys.filter(filter),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterCustomLite(filter)
    },
    select: (data) => data.data,
  })
}

export const useCustomEpisodeLiteSuspense = (
  filter: CustomEpisodeQueryFilter
) => {
  return useSuspenseQuery({
    queryKey: customEpisodeQueryKeys.filter(filter),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterCustomLite(filter)
    },
    select: (data) => data.data,
  })
}
