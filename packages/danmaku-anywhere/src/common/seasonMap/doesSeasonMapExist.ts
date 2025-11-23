import type { SeasonMap } from '@/common/seasonMap/types'

export const doesSeasonMapExist = (
  seasonMaps: SeasonMap[],
  key: string,
  providerConfigId: string,
  seasonId: number
) => {
  const seasonMap = seasonMaps.find((m) => m.key === key)
  if (!seasonMap) {
    return false
  }
  return seasonMap.seasons[providerConfigId] === seasonId
}
