import type {
  BilibiliOf,
  EpisodeMeta,
} from '@danmaku-anywhere/danmaku-converter'
import { findEpisodeByNumber } from '../common/episodeMatching'
import type { OmitSeasonId } from '../IDanmakuProvider'

/**
 * Finds a Bilibili episode in a list by episode number.
 */
export function findBilibiliEpisodeInList(
  episodes: OmitSeasonId<BilibiliOf<EpisodeMeta>>[],
  episodeNumber: number
): OmitSeasonId<BilibiliOf<EpisodeMeta>> | null {
  return findEpisodeByNumber(episodes, episodeNumber)
}
