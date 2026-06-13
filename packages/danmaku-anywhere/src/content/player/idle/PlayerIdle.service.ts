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
export function isOverVideo(event: Event, video: HTMLVideoElement): boolean {
  const point = pointerPoint(event)
  if (!point) {
    return false
  }
  const rect = video.getBoundingClientRect()
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

  constructor(
    @inject(VideoNodeObserverService)
    private videoNodeObs: VideoNodeObserverService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[PlayerIdleService]')
  }

  start() {
    if (this.tracker) {
      return
    }
    this.currentVideo = this.videoNodeObs.activeVideo
    this.tracker = new IdleTracker(document, {
      shouldCount: (event) => {
        return (
          this.currentVideo !== null && isOverVideo(event, this.currentVideo)
        )
      },
    })
    this.tracker.subscribe((active) => {
      for (const listener of this.listeners) {
        listener(active)
      }
    })
    this.videoNodeObs.addEventListener('videoNodeChange', (video) => {
      this.logger.debug('Following idle target to new video', video)
      this.currentVideo = video
    })
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
