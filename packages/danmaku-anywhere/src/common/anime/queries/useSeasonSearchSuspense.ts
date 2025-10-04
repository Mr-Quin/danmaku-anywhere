import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SeasonSearchParams } from '@/common/anime/dto'
import { getTrackingService } from '@/common/hooks/tracking/useSetupTracking'
import { Logger } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { providerTypeToDanmakuSource } from '@/common/options/providerConfig/schema'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useSeasonSearchSuspense = (
  providerConfig: ProviderConfig,
  keyword: string
) => {
  const { t } = useTranslation()

  const params: SeasonSearchParams = useMemo(() => {
    const provider = providerTypeToDanmakuSource[providerConfig.type]

    return {
      keyword,
      provider,
      customBaseUrl: '',
      providerId: providerConfig.id,
      providerConfig,
    }
  }, [providerConfig, keyword])

  return useSuspenseQuery({
    queryKey: seasonQueryKeys.search(params),
    queryFn: async (): Promise<
      | {
          success: true
          data: (Season | CustomSeason)[]
          params: SeasonSearchParams
          providerConfig: ProviderConfig
        }
      | {
          success: false
          data: null
          params: SeasonSearchParams
          providerConfig: ProviderConfig
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
          providerConfig,
        }
      } catch (error) {
        Logger.debug('useMediaSearchSuspense error', error)
        const errorMessage =
          error instanceof Error ? error.message : t('error.unknown')
        return {
          success: false,
          data: null,
          params,
          providerConfig,
          error: errorMessage,
        }
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
