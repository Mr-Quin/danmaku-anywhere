import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'

// Buckets a season by source manifest; custom and orphaned seasons (no
// manifestId) share `unknown`. Callers needing uniqueness append id/indexedId.
export function seasonSourceKey(
  season: Season | SeasonInsert | CustomSeason
): string {
  return 'manifestId' in season && season.manifestId
    ? season.manifestId
    : 'unknown'
}
