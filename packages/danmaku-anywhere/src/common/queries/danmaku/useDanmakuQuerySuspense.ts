import { useSuspenseQuery } from '@tanstack/react-query'

import { chromeRpcClient } from '@/common/rpc/client'
import type { DanmakuGetOneDto, DanmakuMeta } from '@/common/types/Danmaku'

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
