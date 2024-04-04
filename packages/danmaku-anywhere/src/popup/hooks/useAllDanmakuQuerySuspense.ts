import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'

export const useAllDanmakuQuerySuspense = () => {
  const query = useSuspenseQuery({
    queryKey: ['danmakuCacheLite', 'all'],
    queryFn: async () => {
      const res = await chromeRpcClient.danmakuGetAllLite()
      if (!res) throw new Error('Failed to get danmaku from cache')
      return res
    },
  })

  return query
}

useAllDanmakuQuerySuspense.queryKey = ['danmakuCacheLite', 'all']
