import { useMutation } from '@tanstack/react-query'
import { match } from 'ts-pattern'

import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { UnsupportedProviderException } from '@/common/danmaku/UnsupportedProviderException'
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
        .with(
          {
            meta: { provider: DanmakuSourceType.Tencent },
          },
          (data) => {
            return chromeRpcClient.danmakuFetch(data)
          }
        )
        .otherwise(({ meta: { provider } }) => {
          throw new UnsupportedProviderException(provider)
        })
    },
  })

  return {
    ...mutation,
    fetch: mutation.mutateAsync,
  }
}
