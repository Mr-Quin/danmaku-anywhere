import type { FrameState, VideoInfo } from '@/content/controller/store/store'

const GRACE_PERIOD_MS = 2000

type FrameWithVideo = FrameState & { videoInfo: VideoInfo }

/**
 * Select the best frame to display danmaku on.
 *
 * Priority (tiebreaker order):
 * 1. Last playing video
 * 2. Largest video (by area)
 * 3. Unmuted video
 * 4. FIFO (Map insertion order)
 *
 * Hysteresis: if the current active frame just paused (within grace period),
 * keep it to avoid disruptive switching (e.g. brief buffering pauses).
 */
export function selectBestFrame(
  allFrames: Map<number, FrameState>,
  currentActiveFrameId: number | undefined
): number | undefined {
  // Spread preserves Map insertion order (FIFO)
  const candidates = [...allFrames.values()].filter(
    (f): f is FrameWithVideo => f.hasVideo
  )

  if (candidates.length === 0) {
    return undefined
  }

  if (candidates.length === 1) {
    return candidates[0].frameId
  }

  // Hysteresis: if the current active frame just paused (within grace period),
  // keep it to avoid disruptive switching (e.g. brief buffering pauses).
  // If it's still playing, let the sort handle comparison with other playing frames.
  if (currentActiveFrameId !== undefined) {
    const current = candidates.find((f) => f.frameId === currentActiveFrameId)
    if (current && !current.videoInfo.playing) {
      const recentlyPaused =
        Date.now() - current.lastPlayTimestamp < GRACE_PERIOD_MS
      if (recentlyPaused) {
        return currentActiveFrameId
      }
    }
  }

  // Stable sort: equal elements keep their original (insertion) order = FIFO
  candidates.sort((a, b) => {
    // 1. Playing beats not playing
    if (a.videoInfo.playing !== b.videoInfo.playing) {
      return a.videoInfo.playing ? -1 : 1
    }
    // 2. Larger video area wins
    const areaA = a.videoInfo.width * a.videoInfo.height
    const areaB = b.videoInfo.width * b.videoInfo.height
    if (areaA !== areaB) {
      return areaB - areaA
    }
    // 3. Unmuted beats muted
    if (a.videoInfo.muted !== b.videoInfo.muted) {
      return a.videoInfo.muted ? 1 : -1
    }
    // 4. FIFO: preserve original array order (from Map insertion order)
    return 0
  })

  return candidates[0].frameId
}
