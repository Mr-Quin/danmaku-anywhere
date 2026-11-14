import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-model'

export function isPersistedSeason(
  season: Season | SeasonInsert | CustomSeason
): season is Season | CustomSeason {
  return 'id' in season && season.id !== undefined
}
