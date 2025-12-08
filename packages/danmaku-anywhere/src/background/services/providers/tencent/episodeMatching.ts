import type {
  EpisodeMeta,
  TencentOf,
} from '@danmaku-anywhere/danmaku-converter'
import type { OmitSeasonId } from '../IDanmakuProvider'

/**
 * Finds a Tencent episode in a list by episode number.
 * Tencent episodes typically use episodeNumber field or can be matched by index.
 */
export function findTencentEpisodeInList(
  episodes: OmitSeasonId<TencentOf<EpisodeMeta>>[],
  episodeNumber: number
): OmitSeasonId<TencentOf<EpisodeMeta>> | null {
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
