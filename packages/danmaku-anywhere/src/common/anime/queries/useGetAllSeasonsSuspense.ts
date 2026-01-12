import { useSuspenseQuery } from '@tanstack/react-query'

import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { SeasonGetAllRequest } from '../dto'

export const useGetAllSeasonsSuspense = (opts: SeasonGetAllRequest = {}) => {
  const query = useSuspenseQuery({
    queryKey: opts.includeEmpty
      ? seasonQueryKeys.allWithOptions(opts)
      : seasonQueryKeys.all(),
    queryFn: async () => {
      return chromeRpcClient.seasonGetAll(opts)
    },
    select: (data) => data.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return query
}
