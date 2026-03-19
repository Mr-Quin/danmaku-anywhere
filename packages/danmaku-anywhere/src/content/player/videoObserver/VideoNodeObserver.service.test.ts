import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoNodeObserverService } from './VideoNodeObserver.service'

// MutationObserver callbacks are microtasks in jsdom
const flush = () => Promise.resolve()

const REMOVE_DEBOUNCE_MS = 500

// jsdom doesn't drive media playback or layout, so stub paused and checkVisibility
function makeVideo(
  opts: { paused?: boolean; visible?: boolean } = {}
): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'paused', {
    get: () => opts.paused ?? true,
    configurable: true,
  })
  video.checkVisibility = vi.fn(() => opts.visible ?? true)
  return video
}

describe('VideoNodeObserverService', () => {
  let service: VideoNodeObserverService
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    service = new VideoNodeObserverService()
  })

  afterEach(() => {
    service.stop()
    container.remove()
    vi.useRealTimers()
  })

  describe('detection', () => {
    it('finds a video already in the DOM when start() is called', async () => {
      const video = makeVideo()
      container.appendChild(video)
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      service.start('video')
      await flush()
      expect(onChange).toHaveBeenCalledWith(video)
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('detects a video added dynamically after start()', async () => {
      service.start('video')
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      expect(onChange).toHaveBeenCalledWith(video)
    })

    it('detects a video nested inside an added parent element', async () => {
      service.start('video')
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      const wrapper = document.createElement('div')
      const video = makeVideo()
      wrapper.appendChild(video)
      container.appendChild(wrapper)
      await flush()
      expect(onChange).toHaveBeenCalledWith(video)
    })

    it('exposes the active video via activeVideo getter', async () => {
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      expect(service.activeVideo).toBe(video)
    })

    it('does not emit twice for the same video element', async () => {
      service.start('video')
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      container.appendChild(video) // DOM no-op — MutationObserver never fires
      await flush()
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('selector filtering', () => {
    it('ignores videos that do not match the selector', async () => {
      service.start('video.player')
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      container.appendChild(makeVideo())
      await flush()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('detects videos that match a class selector', async () => {
      service.start('video.player')
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      const video = makeVideo()
      video.className = 'player'
      container.appendChild(video)
      await flush()
      expect(onChange).toHaveBeenCalledWith(video)
    })
  })

  describe('remove debounce', () => {
    it('does not fire videoNodeRemove immediately', async () => {
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      const onRemove = vi.fn()
      service.addEventListener('videoNodeRemove', onRemove)
      video.remove()
      await flush()
      expect(onRemove).not.toHaveBeenCalled()
    })

    it('fires videoNodeRemove after the debounce window', async () => {
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      const onRemove = vi.fn()
      service.addEventListener('videoNodeRemove', onRemove)
      video.remove()
      await flush()
      vi.advanceTimersByTime(REMOVE_DEBOUNCE_MS)
      expect(onRemove).toHaveBeenCalledWith(video)
    })

    it('fires videoNodeRemove when the parent container is removed', async () => {
      service.start('video')
      const wrapper = document.createElement('div')
      const video = makeVideo()
      wrapper.appendChild(video)
      container.appendChild(wrapper)
      await flush()
      const onRemove = vi.fn()
      service.addEventListener('videoNodeRemove', onRemove)
      wrapper.remove()
      await flush()
      vi.advanceTimersByTime(REMOVE_DEBOUNCE_MS)
      expect(onRemove).toHaveBeenCalled()
    })

    it('activeVideo is null after the debounce fires', async () => {
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      video.remove()
      await flush()
      vi.advanceTimersByTime(REMOVE_DEBOUNCE_MS)
      expect(service.activeVideo).toBeNull()
    })
  })

  describe('SPA navigation', () => {
    it('cancels remove debounce when the same element is re-added', async () => {
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      const onRemove = vi.fn()
      service.addEventListener('videoNodeRemove', onRemove)
      video.remove()
      await flush()
      container.appendChild(video)
      await flush()
      vi.advanceTimersByTime(REMOVE_DEBOUNCE_MS)
      expect(onRemove).not.toHaveBeenCalled()
      expect(service.activeVideo).toBe(video)
    })

    it('cancels remove debounce and emits change when a different video is added', async () => {
      service.start('video')
      const video1 = makeVideo()
      container.appendChild(video1)
      await flush()
      const onRemove = vi.fn()
      const onChange = vi.fn()
      service.addEventListener('videoNodeRemove', onRemove)
      service.addEventListener('videoNodeChange', onChange)
      onChange.mockClear()

      video1.remove()
      await flush()
      const video2 = makeVideo()
      container.appendChild(video2)
      await flush()
      vi.advanceTimersByTime(REMOVE_DEBOUNCE_MS)

      expect(onRemove).not.toHaveBeenCalled()
      expect(onChange).toHaveBeenCalledWith(video2)
      expect(service.activeVideo).toBe(video2)
    })

    it('cancels remove debounce even when the re-add is within the 100ms throttle window', async () => {
      // Regression: the old code cleared the timeout inside the emit path, which
      // was skipped when the throttle fired first for the same element re-added
      // within 100ms. The state machine fixes this structurally.
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      const onRemove = vi.fn()
      service.addEventListener('videoNodeRemove', onRemove)

      video.remove()
      await flush()
      container.appendChild(video)
      await flush()
      vi.advanceTimersByTime(REMOVE_DEBOUNCE_MS)
      expect(onRemove).not.toHaveBeenCalled()
    })
  })

  describe('active video priority', () => {
    it('prefers a playing+visible video over a paused one', async () => {
      service.start('video')
      container.appendChild(makeVideo({ paused: true, visible: true }))
      const playing = makeVideo({ paused: false, visible: true })
      container.appendChild(playing)
      await flush()
      expect(service.activeVideo).toBe(playing)
    })

    it('prefers a playing+hidden video over a paused+visible one', async () => {
      service.start('video')
      container.appendChild(makeVideo({ paused: true, visible: true }))
      const playingHidden = makeVideo({ paused: false, visible: false })
      container.appendChild(playingHidden)
      await flush()
      expect(service.activeVideo).toBe(playingHidden)
    })

    it('prefers a visible video over an invisible one when both are paused', async () => {
      service.start('video')
      container.appendChild(makeVideo({ paused: true, visible: false }))
      const visible = makeVideo({ paused: true, visible: true })
      container.appendChild(visible)
      await flush()
      expect(service.activeVideo).toBe(visible)
    })

    it('falls back to the first video when all are paused and invisible', async () => {
      service.start('video')
      const v1 = makeVideo({ paused: true, visible: false })
      container.appendChild(v1)
      container.appendChild(makeVideo({ paused: true, visible: false }))
      await flush()
      expect(service.activeVideo).toBe(v1)
    })

    it('re-evaluates active video when a play event fires', async () => {
      service.start('video')
      const v1 = makeVideo({ paused: true, visible: true })
      const v2 = makeVideo({ paused: true, visible: true })
      container.appendChild(v1)
      container.appendChild(v2)
      await flush()
      Object.defineProperty(v2, 'paused', {
        get: () => false,
        configurable: true,
      })
      v2.dispatchEvent(new Event('play'))
      await flush()
      expect(service.activeVideo).toBe(v2)
    })

    it('immediately switches to another video when the active one is removed', async () => {
      service.start('video')
      const v1 = makeVideo()
      const v2 = makeVideo()
      container.appendChild(v1)
      container.appendChild(v2)
      await flush()
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      v1.remove()
      await flush()
      expect(service.activeVideo).toBe(v2)
      expect(onChange).toHaveBeenCalledWith(v2)
    })
  })

  describe('src change', () => {
    it('emits videoNodeChange when the src attribute changes on the active video', async () => {
      service.start('video')
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      onChange.mockClear()

      video.setAttribute('src', 'https://example.com/video.mp4')
      await flush()
      expect(onChange).toHaveBeenCalledWith(video)
    })
  })

  describe('lifecycle', () => {
    it('stop() cancels a pending remove debounce', async () => {
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      const onRemove = vi.fn()
      service.addEventListener('videoNodeRemove', onRemove)
      video.remove()
      await flush()
      service.stop()
      vi.advanceTimersByTime(REMOVE_DEBOUNCE_MS)
      expect(onRemove).not.toHaveBeenCalled()
    })

    it('stop() removes all event listeners', async () => {
      service.start('video')
      const onChange = vi.fn()
      service.addEventListener('videoNodeChange', onChange)
      service.stop()
      container.appendChild(makeVideo())
      await flush()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('activeVideo is null after stop()', async () => {
      service.start('video')
      const video = makeVideo()
      container.appendChild(video)
      await flush()
      service.stop()
      expect(service.activeVideo).toBeNull()
    })
  })
})
