import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import type { MediaSearchParams, MediaSearchResult } from '@/common/anime/dto'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { Logger } from '@/common/Logger'

export const useMediaSearchSuspense = <T extends MediaSearchResult>(
  provider: RemoteDanmakuSourceType,
  params: MediaSearchParams,
  getData: (params: MediaSearchParams) => Promise<T>
) => {
  const { t } = useTranslation()

  return useSuspenseQuery({
    queryKey: mediaKeys.search(provider, params),
    queryFn: async (): Promise<
      | {
          success: true
          data: MediaSearchResult
          params: MediaSearchParams
          provider: RemoteDanmakuSourceType
        }
      | {
          success: false
          data: null
          params: MediaSearchParams
          provider: RemoteDanmakuSourceType
          error: string
        }
    > => {
      try {
        const data = await getData(params)
        return {
          success: true,
          data,
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
