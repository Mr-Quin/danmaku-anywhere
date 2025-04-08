import { useMutation } from '@tanstack/react-query'

import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

/**
 * Fetches danmaku from cache
 * If not found in cache, fetches from server and saves to cache
 *
 * This is a mutation because it updates the cache
 */
export const useFetchDanmaku = () => {
  const mutation = useMutation({
    mutationKey: danmakuQueryKeys.all(),
    mutationFn: async (data: DanmakuFetchDto) => {
      const res = await chromeRpcClient.episodeFetch(data)
      return res.data
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
