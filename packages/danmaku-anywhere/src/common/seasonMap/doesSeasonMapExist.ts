import type { RemoteDanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { SeasonMap } from '@/common/seasonMap/types'

export const doesSeasonMapExist = (
  seasonMaps: SeasonMap[],
  key: string,
  provider: RemoteDanmakuSourceType,
  seasonId: number
) => {
  const seasonMap = seasonMaps.find((m) => m.key === key)
  if (!seasonMap) {
    return false
  }
  return seasonMap[provider] === seasonId
}
