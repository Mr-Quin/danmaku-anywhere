import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAllDanmakuQuerySuspense } from '../../common/hooks/useAllDanmakuQuerySuspense'

import { useDanmakuQuerySuspense } from '@/common/hooks/useDanmakuQuerySuspense'
import { chromeRpcClient } from '@/common/rpc/client'

/**
 * Fetches danmaku from cahce
 * If not found in cache, fetches from server and saves to cache
 *
 * This is a mutation because it updates the cache
 */
export const useFetchDanmakuMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: chromeRpcClient.danmakuFetch,
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: useDanmakuQuerySuspense.queryKey(v.data.episodeId),
      })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
