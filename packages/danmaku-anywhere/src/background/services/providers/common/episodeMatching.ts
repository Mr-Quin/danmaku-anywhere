import type { EpisodeMeta } from '@danmaku-anywhere/danmaku-converter'
import type { OmitSeasonId } from '../IDanmakuProvider'

/**
 * Generic function to find an episode in a list by episode number.
 * First tries to match by the episodeNumber field, then falls back to index-based matching.
 */
export function findEpisodeByNumber<T extends OmitSeasonId<EpisodeMeta>>(
  episodes: T[],
  episodeNumber: number
): T | null {
  // First, try to match by the episodeNumber field if it exists
  const episodeByNumber = episodes.find((ep) => {
    return ep.episodeNumber?.toString() === episodeNumber.toString()
  })

  if (episodeByNumber) {
    return episodeByNumber
  }

  // Fallback: match by index (1-based)
  // This handles cases where episodes are numbered sequentially
  if (episodeNumber > 0 && episodeNumber <= episodes.length) {
    return episodes[episodeNumber - 1]
  }

  return null
}
