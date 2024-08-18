import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import type {
  MediaSearchParamsData,
  MediaSearchResult,
} from '@/common/anime/dto'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useMediaSearchSuspense = (params: MediaSearchParamsData) => {
  const { t } = useTranslation()

  return useSuspenseQuery({
    queryKey: mediaKeys.search(params),
    queryFn: async (): Promise<
      | {
          success: true
          data: MediaSearchResult
          params: MediaSearchParamsData
        }
      | {
          success: false
          data: null
          params: MediaSearchParamsData
          error: string
        }
    > => {
      try {
        const data = await chromeRpcClient.mediaSearch(params)
        return {
          success: true,
          data,
          params,
        }
      } catch (error) {
        Logger.debug('useMediaSearchSuspense error', error)
        const errorMessage =
          error instanceof Error ? error.message : t('common.error.unknown')
        return {
          success: false,
          data: null,
          params,
          error: errorMessage,
        }
      }
    },
    staleTime: Infinity,
    retry: false,
  })
}
