import { useMutation } from '@tanstack/react-query'
import { match } from 'ts-pattern'

import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

/**
 * Fetches danmaku from cache
 * If not found in cache, fetches from server and saves to cache
 *
 * This is a mutation because it updates the cache
 */
export const useFetchDanmaku = () => {
  const mutation = useMutation({
    mutationKey: danmakuKeys.all(),
    mutationFn: (data: DanmakuFetchDto) => {
      return match(data)
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
        .otherwise(() => {
          throw new Error('Provider not supported')
        })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
