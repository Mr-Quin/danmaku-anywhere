import { describe, expect, it } from 'vitest'
import type { FrameState, VideoInfo } from '@/content/controller/store/store'
import { selectBestFrame } from './selectBestFrame'

const GRACE_PERIOD_MS = 2000

function makeFrame(
  frameId: number,
  videoInfo?: Partial<VideoInfo>,
  lastPlayTimestamp = 0
): FrameState {
  return {
    frameId,
    url: `https://example.com/frame/${frameId}`,
    started: true,
    mounted: false,
    hasVideo: videoInfo != null,
    videoChangeCount: 0,
    videoInfo: videoInfo
      ? {
          playing: false,
          muted: true,
          width: 640,
          height: 360,
          src: '',
          ...videoInfo,
        }
      : undefined,
    lastPlayTimestamp,
  }
}

function makeMap(...frames: FrameState[]): Map<number, FrameState> {
  return new Map(frames.map((f) => [f.frameId, f]))
}

describe('selectBestFrame', () => {
  describe('basic selection', () => {
    it('returns undefined when no frames have video', () => {
      const frames = makeMap(makeFrame(1), makeFrame(2))
      expect(selectBestFrame(frames, undefined)).toBeUndefined()
    })

    it('returns the only frame with video', () => {
      const frames = makeMap(makeFrame(1), makeFrame(2, {}))
      expect(selectBestFrame(frames, undefined)).toBe(2)
    })
  })

  describe('hysteresis', () => {
    it('keeps current active frame while it is playing', () => {
      const frames = makeMap(
        makeFrame(1, { playing: true, width: 1920, height: 1080 }),
        makeFrame(2, { playing: true, width: 640, height: 360 })
      )
      expect(selectBestFrame(frames, 1)).toBe(1)
    })

    it('keeps current active frame within the grace period after pausing', () => {
      const recentTimestamp = Date.now() - GRACE_PERIOD_MS / 2
      const frames = makeMap(
        makeFrame(1, { playing: false }, recentTimestamp),
        makeFrame(2, { playing: true })
      )
      expect(selectBestFrame(frames, 1)).toBe(1)
    })

    it('switches away from current frame after grace period expires', () => {
      const oldTimestamp = Date.now() - GRACE_PERIOD_MS - 100
      const frames = makeMap(
        makeFrame(1, { playing: false }, oldTimestamp),
        makeFrame(2, { playing: true })
      )
      expect(selectBestFrame(frames, 1)).toBe(2)
    })

    it('does not apply hysteresis when current frame has no video', () => {
      const frames = makeMap(makeFrame(1), makeFrame(2, { playing: true }))
      expect(selectBestFrame(frames, 1)).toBe(2)
    })
  })

  describe('sort priority', () => {
    it('prefers a playing frame over a paused one', () => {
      const frames = makeMap(makeFrame(1, {}), makeFrame(2, { playing: true }))
      expect(selectBestFrame(frames, undefined)).toBe(2)
    })

    it('prefers the larger frame when both are paused', () => {
      const frames = makeMap(
        makeFrame(1, { width: 640, height: 360 }),
        makeFrame(2, { width: 1920, height: 1080 })
      )
      expect(selectBestFrame(frames, undefined)).toBe(2)
    })

    it('prefers unmuted over muted when area is equal', () => {
      const frames = makeMap(
        makeFrame(1, { muted: true }),
        makeFrame(2, { muted: false })
      )
      expect(selectBestFrame(frames, undefined)).toBe(2)
    })

    it('falls back to FIFO (Map insertion order) when all else is equal', () => {
      const frames = makeMap(makeFrame(1, {}), makeFrame(2, {}))
      expect(selectBestFrame(frames, undefined)).toBe(1)
    })

    it('playing beats larger area', () => {
      const frames = makeMap(
        makeFrame(1, { playing: false, width: 1920, height: 1080 }),
        makeFrame(2, { playing: true, width: 640, height: 360 })
      )
      expect(selectBestFrame(frames, undefined)).toBe(2)
    })
  })
})
