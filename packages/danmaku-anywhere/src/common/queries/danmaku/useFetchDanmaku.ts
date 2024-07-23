import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'

import { useDanmakuQuerySuspense } from '@/common/queries/danmaku/useDanmakuQuerySuspense'
import { chromeRpcClient } from '@/common/rpc/client'

/**
 * Fetches danmaku from cache
 * If not found in cache, fetches from server and saves to cache
 *
 * This is a mutation because it updates the cache
 */
export const useFetchDanmaku = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: chromeRpcClient.danmakuFetchDDP,
    onSuccess: (_, v) => {
      void queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: useDanmakuQuerySuspense.queryKey(v.meta),
      })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
