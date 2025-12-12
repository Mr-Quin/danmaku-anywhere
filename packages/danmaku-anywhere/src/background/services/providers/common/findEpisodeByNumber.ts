import type { EpisodeMeta } from '@danmaku-anywhere/danmaku-converter'
import { chineseToNumber } from '@/content/controller/danmaku/integration/xPathPolicyOps/chineseToNumber'
import { mediaRegexMatcher } from '@/content/controller/danmaku/integration/xPathPolicyOps/mediaRegexMatcher'
import type { OmitSeasonId } from '../IDanmakuProvider'

function getEpisodeNumberFromTitle(title: string): number | null {
  const match = mediaRegexMatcher.findCommonEpisode(title)

  if (match) {
    const numericTitle = chineseToNumber(match.value.toString())
    if (numericTitle !== null) {
      return numericTitle
    }
  }

  return null
}

export function findEpisodeByNumber<T extends OmitSeasonId<EpisodeMeta>>(
  episodes: T[],
  episodeNumber: number
): T | null {
  const episodeByNumber = episodes.find((ep) => {
    // try to match by the episodeNumber field if it exists
    if (ep.episodeNumber !== undefined) {
      return ep.episodeNumber.toString() === episodeNumber.toString()
    }

    // try to extract a numeric episode number from the title
    const matchedEpisodeNumber = getEpisodeNumberFromTitle(ep.title)

    if (matchedEpisodeNumber !== null) {
      return matchedEpisodeNumber === episodeNumber
    }

    return false
  })

  if (episodeByNumber !== undefined) {
    return episodeByNumber
  }

  return null
}
