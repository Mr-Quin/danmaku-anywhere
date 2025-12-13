import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SeasonSearchRequest } from '@/common/anime/dto'
import { Logger } from '@/common/Logger'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'

export const useSeasonSearchSuspense = (
  providerConfigId: string,
  keyword: string
) => {
  const { t } = useTranslation()

  const params: SeasonSearchRequest = useMemo(() => {
    return {
      keyword,
      providerConfigId,
    }
  }, [providerConfigId, keyword])

  return useSuspenseQuery({
    queryKey: seasonQueryKeys.search(params),
    queryFn: async (): Promise<
      | {
          success: true
          data: (Season | CustomSeason)[]
          params: SeasonSearchRequest
          providerConfigId: string
        }
      | {
          success: false
          data: null
          params: SeasonSearchRequest
          providerConfigId: string
          error: string
        }
    > => {
      try {
        getTrackingService().track('searchSeason', params)
        const data = await chromeRpcClient.seasonSearch(params)
        return {
          success: true,
          data: data.data,
          params,
          providerConfigId,
        }
      } catch (error) {
        Logger.debug('useMediaSearchSuspense error', error)
        const errorMessage =
          error instanceof Error
            ? error.message
            : t('error.unknown', 'Something went wrong.')
        return {
          success: false,
          data: null,
          params,
          providerConfigId,
          error: errorMessage,
        }
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
