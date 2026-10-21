import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Logger } from '@/common/Logger'
import { describeSourceError } from '@/common/providers/describeSourceError'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { isNetworkError } from '@/common/utils/networkError'

export type ProviderSearchFailure =
  | { kind: 'network' }
  | { kind: 'other'; message: string }

export type ProviderSeasonResult =
  | { success: true; data: (Season | SeasonInsert | CustomSeason)[] }
  | { success: false; error: ProviderSearchFailure }

export async function searchSeasonForProvider(
  providerConfigId: string,
  keyword: string
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
    if (isNetworkError(error)) {
      return { success: false, error: { kind: 'network' } }
    }
    return {
      success: false,
      error: { kind: 'other', message: describeSourceError(error) },
    }
  }
}
