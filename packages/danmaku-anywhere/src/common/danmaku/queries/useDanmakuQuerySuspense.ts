import { useSuspenseQuery } from '@tanstack/react-query'

import type { DanmakuGetOneDto } from '@/common/danmaku/dto'
import type { DanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
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

useDanmakuQuerySuspense.queryKey = (meta: DanmakuMeta) => [
  'danmaku',
  'get',
  meta,
]
