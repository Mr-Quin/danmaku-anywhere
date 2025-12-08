import type {
  BilibiliOf,
  EpisodeMeta,
} from '@danmaku-anywhere/danmaku-converter'
import type { OmitSeasonId } from '../IDanmakuProvider'

/**
 * Finds a Bilibili episode in a list by episode number.
 * Bilibili episodes typically use episodeNumber field or can be matched by index.
 */
export function findBilibiliEpisodeInList(
  episodes: OmitSeasonId<BilibiliOf<EpisodeMeta>>[],
  episodeNumber: number
): OmitSeasonId<BilibiliOf<EpisodeMeta>> | null {
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
