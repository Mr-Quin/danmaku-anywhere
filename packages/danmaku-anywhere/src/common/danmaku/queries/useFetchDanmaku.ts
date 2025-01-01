import { useMutation } from '@tanstack/react-query'
import { match } from 'ts-pattern'

import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
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
      const res = await match(data)
        .with(
          {
            meta: { provider: DanmakuSourceType.DanDanPlay },
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
        .with(
          {
            meta: { provider: DanmakuSourceType.Tencent },
          },
          (data) => {
            return chromeRpcClient.danmakuFetch(data)
          }
        )
        .exhaustive()

      return res.data
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
