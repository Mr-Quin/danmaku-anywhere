import { useSuspenseQuery } from '@tanstack/react-query'

import { episodeQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useAllDanmakuSuspense = () => {
  const query = useSuspenseQuery({
    queryKey: episodeQueryKeys.filter({ all: true }),
    queryFn: async () => {
      return chromeRpcClient.episodeFilterLite({ all: true })
    },
    select: (data) => data.data,
  })

  return query
}
