import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { SeasonSearchParams } from '@/common/anime/dto'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { Logger } from '@/common/Logger'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useSeasonSearchSuspense = (
  provider: RemoteDanmakuSourceType,
  keyword: string
) => {
  const { t } = useTranslation()

  const params = { keyword, provider }

  return useSuspenseQuery({
    queryKey: seasonQueryKeys.search(provider, params),
    queryFn: async (): Promise<
      | {
          success: true
          data: Season[]
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
        const data = await chromeRpcClient.seasonSearch(params)
        return {
          success: true,
          data: data.data,
          params,
          provider,
        }
      } catch (error) {
        Logger.debug('useMediaSearchSuspense error', error)
        const errorMessage =
          error instanceof Error ? error.message : t('error.unknown')
        return {
          success: false,
          data: null,
          params,
          provider,
          error: errorMessage,
        }
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
