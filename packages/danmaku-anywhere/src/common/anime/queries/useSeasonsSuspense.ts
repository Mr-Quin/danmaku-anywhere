import { useSuspenseQuery } from '@tanstack/react-query'

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return query
}
