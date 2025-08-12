import type { DanDanPlayOf, EpisodeMeta } from '@danmaku-anywhere/danmaku-converter'

export type DebugLog = (message?: any, ...optionalParams: any[]) => void

/**
 * Legacy DDP computed episodeId formula. Kept here to avoid coupling to class instances.
 */
export const computeDanDanPlayEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

/**
 * Find an episode in a DDP episode list by its episode number, with a fallback to the legacy computed episodeId.
 * Returns undefined if no match is found.
 */
export function findDanDanPlayEpisodeInList(
  episodes: DanDanPlayOf<EpisodeMeta>[],
  episodeNumber: number,
  animeId: number,
  debugLog?: DebugLog
): DanDanPlayOf<EpisodeMeta> | undefined {
  // Preferred: match by the actual episodeNumber field
  const episodeByNumber = episodes.find(
    (ep) => String(ep.episodeNumber) === String(episodeNumber)
  )

  if (episodeByNumber) {
    debugLog?.(
      '[findDanDanPlayEpisodeInList] Matched by episodeNumber',
      { requested: episodeNumber, matchedEpisodeId: episodeByNumber.providerIds.episodeId }
    )
    return episodeByNumber
  }

  // Fallback: legacy matching using computed episodeId
  const computedId = computeDanDanPlayEpisodeId(animeId, episodeNumber)
  const episodeByComputedId = episodes.find(
    (ep) => ep.providerIds.episodeId === computedId
  )

  if (episodeByComputedId) {
    debugLog?.(
      '[findDanDanPlayEpisodeInList] Fallback matched by computed episodeId',
      { requested: episodeNumber, computedId }
    )
  } else {
    debugLog?.(
      '[findDanDanPlayEpisodeInList] No episode matched',
      { requested: episodeNumber, computedId }
    )
  }

  return episodeByComputedId
}