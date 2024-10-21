import { useSuspenseQuery } from '@tanstack/react-query'

import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useAllDanmakuSuspense = () => {
  const query = useSuspenseQuery({
    queryKey: danmakuKeys.all(),
    queryFn: async () => {
      return chromeRpcClient.danmakuGetAllLite()
    },
    select: (data) => data.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return query
}
