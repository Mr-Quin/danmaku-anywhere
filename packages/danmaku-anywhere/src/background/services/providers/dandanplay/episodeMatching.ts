import {
  type DanDanPlayOf,
  DanmakuSourceType,
  type EpisodeMeta,
} from '@danmaku-anywhere/danmaku-converter'
import { isProvider } from '@/common/danmaku/utils'
import type { OmitSeasonId } from '../IDanmakuProvider'

const computeDanDanPlayEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

export function findDanDanPlayEpisodeInList(
  episodes: OmitSeasonId<DanDanPlayOf<EpisodeMeta>>[],
  episodeNumber: number,
  animeId: number
) {
  // prefer to match by the actual episodeNumber field
  const episodeByNumber = episodes.find((ep) => {
    return ep.episodeNumber?.toString() === episodeNumber.toString()
  })

  if (episodeByNumber) {
    return episodeByNumber
  }

  // if episode number not found, try to match using computed episodeId
  const computedId = computeDanDanPlayEpisodeId(animeId, episodeNumber)
  return episodes.find((ep) => {
    return (
      isProvider(ep, DanmakuSourceType.DanDanPlay) &&
      ep.providerIds.episodeId === computedId
    )
  })
}
