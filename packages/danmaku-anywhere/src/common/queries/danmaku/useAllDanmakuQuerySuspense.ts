import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'

export const useAllDanmakuQuerySuspense = () => {
  const query = useSuspenseQuery({
    queryKey: ['danmaku ', 'getAllLite'],
    queryFn: async () => {
      const res = await chromeRpcClient.danmakuGetAllLite()
      if (!res) throw new Error('Failed to get danmaku from cache')
      return res
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return query
}

useAllDanmakuQuerySuspense.queryKey = () => ['danmaku ', 'getAllLite']
