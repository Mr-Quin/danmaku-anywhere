import { useMutation, useQueryClient } from '@tanstack/react-query'
import { match } from 'ts-pattern'

import { useAllDanmakuQuerySuspense } from './useAllDanmakuQuerySuspense'

import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
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
    mutationFn: (data: DanmakuFetchDto) => {
      return match(data)
        .with(
          {
            meta: { provider: DanmakuSourceType.DDP },
          },
          (data) => {
            return chromeRpcClient.danmakuFetch(data)
          }
        )
        .with(
          {
            meta: { provider: DanmakuSourceType.Bilibili },
          },
          (data) => {
            return chromeRpcClient.danmakuFetch(data)
          }
        )
        .otherwise(() => {
          throw new Error('Provider not supported')
        })
    },
    onSuccess: (result) => {
      // TODO: Remove duplicate invalidation
      void queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey(),
      })
      if (result.episodeId) {
        void queryClient.invalidateQueries({
          queryKey: useDanmakuQuerySuspense.queryKey({
            provider: result.provider,
            episodeId: result.episodeId,
          }),
        })
      }
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
