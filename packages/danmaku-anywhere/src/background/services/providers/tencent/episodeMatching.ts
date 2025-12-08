import type {
  EpisodeMeta,
  TencentOf,
} from '@danmaku-anywhere/danmaku-converter'
import { findEpisodeByNumber } from '../common/episodeMatching'
import type { OmitSeasonId } from '../IDanmakuProvider'

/**
 * Finds a Tencent episode in a list by episode number.
 */
export function findTencentEpisodeInList(
  episodes: OmitSeasonId<TencentOf<EpisodeMeta>>[],
  episodeNumber: number
): OmitSeasonId<TencentOf<EpisodeMeta>> | null {
  return findEpisodeByNumber(episodes, episodeNumber)
}
