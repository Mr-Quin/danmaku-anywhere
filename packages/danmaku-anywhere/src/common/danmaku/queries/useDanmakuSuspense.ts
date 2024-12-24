import { useSuspenseQuery } from '@tanstack/react-query'

import type { DanmakuGetOneDto } from '@/common/danmaku/dto'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useDanmakuSuspense = (data: DanmakuGetOneDto) => {
  const query = useSuspenseQuery({
    queryKey: danmakuKeys.one(data),
    queryFn: async () => {
      return await chromeRpcClient.danmakuGetOne(data)
    },
    select: (res) => res.data,
  })

  return query
}
