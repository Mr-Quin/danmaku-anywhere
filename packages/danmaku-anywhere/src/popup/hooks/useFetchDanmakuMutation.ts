import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

/**
 * Fetches danmaku from cahce
 * If not found in cache, fetches from server and saves to cache
 *
 * This is a mutation because it updates the cache
 */
export const useFetchDanmakuMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: danmakuMessage.fetch,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey,
      })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
