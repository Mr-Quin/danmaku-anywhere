import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Logger } from '@/common/Logger'
import type { SeasonSearchParams } from '@/common/anime/dto'
import { SeasonV1 } from '@/common/anime/types/v1/schema'
import {
  DanmakuSourceType,
  RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

const methodMap: Record<
  RemoteDanmakuSourceType,
  (params: SeasonSearchParams) => Promise<{ data: SeasonV1[] }>
> = {
  [DanmakuSourceType.DanDanPlay]: chromeRpcClient.seasonSearchDanDanPlay,
  [DanmakuSourceType.Bilibili]: chromeRpcClient.seasonSearchBilibili,
  [DanmakuSourceType.Tencent]: chromeRpcClient.seasonSearchTencent,
}

export const useSeasonSearchSuspense = <T extends SeasonV1>(
  provider: RemoteDanmakuSourceType,
  keyword: string
) => {
  const { t } = useTranslation()

  const params = { keyword }

  return useSuspenseQuery({
    queryKey: seasonQueryKeys.search(provider, params),
    queryFn: async (): Promise<
      | {
          success: true
          data: SeasonV1[]
          params: SeasonSearchParams
          provider: RemoteDanmakuSourceType
        }
      | {
          success: false
          data: null
          params: SeasonSearchParams
          provider: RemoteDanmakuSourceType
          error: string
        }
    > => {
      try {
        const data = await methodMap[provider](params)
        return {
          success: true,
          data: data.data,
          params,
          provider,
        }
      } catch (error) {
        Logger.debug('useMediaSearchSuspense error', error)
        const errorMessage =
          error instanceof Error ? error.message : t('common.error.unknown')
        return {
          success: false,
          data: null,
          params,
          provider,
          error: errorMessage,
        }
      }
    },
    staleTime: Infinity,
    retry: false,
  })
}
