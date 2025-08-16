import type {
  DanDanPlayOf,
  EpisodeMeta,
} from '@danmaku-anywhere/danmaku-converter'

const computeDanDanPlayEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

export function findDanDanPlayEpisodeInList(
  episodes: DanDanPlayOf<EpisodeMeta>[],
  episodeNumber: number,
  animeId: number
): DanDanPlayOf<EpisodeMeta> | undefined {
  // prefer to match by the actual episodeNumber field
  const episodeByNumber = episodes.find((ep) => {
    return ep.episodeNumber?.toString() === episodeNumber.toString()
  })

  if (episodeByNumber) {
    return episodeByNumber
  }

  // if episode number not found, try to match using computed episodeId
  const computedId = computeDanDanPlayEpisodeId(animeId, episodeNumber)
  return episodes.find((ep) => ep.providerIds.episodeId === computedId)
}
