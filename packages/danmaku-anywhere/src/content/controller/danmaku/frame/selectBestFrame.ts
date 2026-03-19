import type { FrameState, VideoInfo } from '@/content/controller/store/store'

const GRACE_PERIOD_MS = 2000

type FrameWithVideo = FrameState & { videoInfo: VideoInfo }

/**
 * Select the best frame to display danmaku on.
 *
 * Priority (tiebreaker order):
 * 1. Currently playing video
 * 2. Largest video (by area)
 * 3. Unmuted video
 * 4. FIFO (Map insertion order)
 *
 * Hysteresis: keeps the current active frame while it is playing, or within a
 * grace period after it pauses (e.g. brief buffering).
 */
export function selectBestFrame(
  allFrames: Map<number, FrameState>,
  currentActiveFrameId: number | undefined
): number | undefined {
  // Fast path: check hysteresis before building the candidates array.
  // Keep the current active frame if it's playing (stability when multiple
  // frames are playing) or just paused within the grace period (buffering).
  if (currentActiveFrameId !== undefined) {
    const current = allFrames.get(currentActiveFrameId)
    if (current?.hasVideo) {
      const frame = current as FrameWithVideo
      const recentlyPaused =
        Date.now() - current.lastPlayTimestamp < GRACE_PERIOD_MS
      if (frame.videoInfo.playing || recentlyPaused) {
        return currentActiveFrameId
      }
    }
  }

  // Spread preserves Map insertion order (FIFO)
  const candidates = [...allFrames.values()].filter(
    (f): f is FrameWithVideo => f.hasVideo && f.videoInfo != null
  )

  if (candidates.length === 0) {
    return undefined
  }

  if (candidates.length === 1) {
    return candidates[0].frameId
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
