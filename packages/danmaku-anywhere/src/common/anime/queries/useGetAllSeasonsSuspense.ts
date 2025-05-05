import { useSuspenseQuery } from '@tanstack/react-query'

import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useGetAllSeasonsSuspense = () => {
  const query = useSuspenseQuery({
    queryKey: seasonQueryKeys.all(),
    queryFn: async () => {
      return chromeRpcClient.seasonGetAll()
    },
    select: (data) => data.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return query
}
