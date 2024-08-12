import { useSuspenseQuery } from '@tanstack/react-query'

import type { DanmakuGetOneDto } from '@/common/danmaku/dto'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useDanmakuQuerySuspense = (data: DanmakuGetOneDto) => {
  const query = useSuspenseQuery({
    queryKey: ['danmaku', 'get', data],
    queryFn: async () => {
      return await chromeRpcClient.danmakuGetOne(data)
    },
  })

  return query
}

useDanmakuQuerySuspense.queryKey = (data: DanmakuGetOneDto) => [
  'danmaku',
  'get',
  data,
]
