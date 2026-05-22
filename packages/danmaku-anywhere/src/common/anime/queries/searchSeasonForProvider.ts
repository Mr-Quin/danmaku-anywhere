import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'

export type ProviderSeasonResult =
  | { success: true; data: (Season | SeasonInsert | CustomSeason)[] }
  | { success: false; error: string }

export async function searchSeasonForProvider(
  providerConfigId: string,
  keyword: string,
  unknownErrorMessage: string
): Promise<ProviderSeasonResult> {
  try {
    getTrackingService().track('searchSeason', { keyword, providerConfigId })
    const data = await chromeRpcClient.seasonSearch({
      keyword,
      providerConfigId,
    })
    return { success: true, data: data.data }
  } catch (error) {
    Logger.debug('searchSeasonForProvider error', { providerConfigId, error })
    const message = error instanceof Error ? error.message : unknownErrorMessage
    return { success: false, error: message }
  }
}
