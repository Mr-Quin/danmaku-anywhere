import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'

import { useDanmakuQuerySuspense } from '@/common/danmaku/queries/useDanmakuQuerySuspense'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

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
    onSuccess: (result, v) => {
      // TODO: Remove duplicate invalidation
      void queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: useDanmakuQuerySuspense.queryKey({
          provider: result.provider,
          episodeId: v.meta.episodeId,
        }),
      })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
