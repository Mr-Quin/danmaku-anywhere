import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-model'

export type HandleSeasonClick = (
  season: Season | SeasonInsert | CustomSeason
) => void
