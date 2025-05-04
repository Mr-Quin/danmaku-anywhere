import { useSuspenseQuery } from '@tanstack/react-query'

import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useGetAllSeasonsSuspense = () => {
  const query = useSuspenseQuery({
    queryKey: danmakuQueryKeys.all(),
    queryFn: async () => {
      return chromeRpcClient.episodeGetAll()
    },
    select: (data) => data.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return query
}
