import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { IdleTracker } from '@/content/common/idleTracker'
import { VideoNodeObserverService } from '@/content/player/videoObserver/VideoNodeObserver.service'

type Listener = (active: boolean) => void

function pointerPoint(event: Event): { x: number; y: number } | null {
  if (event instanceof MouseEvent) {
    return { x: event.clientX, y: event.clientY }
  }
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : null
  }
  return null
}

// The overlays (danmaku, info panel, skip button) sit on top of the video, so
// their pointer events land within its rect; checking geometry counts activity
// over the whole player region without counting the rest of the page.
export function isOverRect(
  event: Event,
  rect: { left: number; top: number; right: number; bottom: number }
): boolean {
  const point = pointerPoint(event)
  if (!point) {
    return false
  }
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  )
}

/**
 * Shared idle state for the player frame, derived from pointer activity over the
 * active video. Consumers (density chart, info panel) subscribe once; the
 * underlying tracker follows the active video as it changes without resetting
 * the idle state, so swapping episodes does not flash the consumers back into
 * view.
 */
@injectable('Singleton')
export class PlayerIdleService {
  private logger: ILogger
  private tracker: IdleTracker | null = null
  private listeners = new Set<Listener>()
  private currentVideo: HTMLVideoElement | null = null
  private videoRect: DOMRect | null = null
  private rectObserver: ResizeObserver | null = null
  private readonly boundRefreshRect: () => void

  constructor(
    @inject(VideoNodeObserverService)
    private videoNodeObs: VideoNodeObserverService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[PlayerIdleService]')
    this.boundRefreshRect = this.refreshRect.bind(this)
  }

  start() {
    if (this.tracker) {
      return
    }
    this.followVideo(this.videoNodeObs.activeVideo)
    this.tracker = new IdleTracker(document, {
      shouldCount: (event) => {
        return this.videoRect !== null && isOverRect(event, this.videoRect)
      },
    })
    this.tracker.subscribe((active) => {
      for (const listener of this.listeners) {
        listener(active)
      }
    })
    // The cached rect is viewport-relative, so refresh it when the page scrolls
    // or resizes rather than reading layout on every pointer move.
    window.addEventListener('scroll', this.boundRefreshRect, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', this.boundRefreshRect, { passive: true })
    this.videoNodeObs.addEventListener('videoNodeChange', (video) => {
      this.logger.debug('Following idle target to new video', video)
      this.followVideo(video)
    })
  }

  private followVideo(video: HTMLVideoElement | null) {
    this.currentVideo = video
    this.rectObserver?.disconnect()
    this.rectObserver = null
    if (video) {
      this.rectObserver = new ResizeObserver(this.boundRefreshRect)
      this.rectObserver.observe(video)
    }
    this.refreshRect()
  }

  private refreshRect() {
    this.videoRect = this.currentVideo?.getBoundingClientRect() ?? null
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getActive(): boolean {
    return this.tracker?.getActive() ?? true
  }
}
