import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Logger } from '@/common/Logger'
import type { SeasonSearchParams } from '@/common/anime/dto'
import { SeasonV1 } from '@/common/anime/types/v1/schema'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { mediaQueryKeys } from '@/common/queries/queryKeys'

export const useMediaSearchSuspense = <T extends SeasonV1>(
  provider: RemoteDanmakuSourceType,
  params: SeasonSearchParams,
  getData: (params: SeasonSearchParams) => Promise<{ data: T[] }>
) => {
  const { t } = useTranslation()

  return useSuspenseQuery({
    queryKey: mediaQueryKeys.search(provider, params),
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
        const data = await getData(params)
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
