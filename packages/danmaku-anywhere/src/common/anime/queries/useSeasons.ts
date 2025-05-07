import { useQuery, useSuspenseQuery } from '@tanstack/react-query'

import type { SeasonQueryFilter } from '@/common/anime/dto'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useGetSeasonSuspense = (filter: SeasonQueryFilter) => {
  const query = useSuspenseQuery({
    queryKey: seasonQueryKeys.many(filter),
    queryFn: async () => {
      return chromeRpcClient.seasonFilter(filter)
    },
    select: (data) => data.data,
  })

  return query
}

export const useGetSeason = (filter: SeasonQueryFilter) => {
  const query = useQuery({
    queryKey: seasonQueryKeys.many(filter),
    queryFn: async () => {
      return chromeRpcClient.seasonFilter(filter)
    },
    select: (data) => data.data,
    throwOnError: true,
  })

  return query
}
