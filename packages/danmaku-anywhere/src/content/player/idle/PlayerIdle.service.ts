import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import {
  createIdleTracker,
  type IdleTracker,
} from '@/content/common/idleTracker'
import { VideoNodeObserverService } from '@/content/player/videoObserver/VideoNodeObserver.service'

type Listener = (active: boolean) => void

function isWithinVideoSubtree(event: Event, video: HTMLVideoElement): boolean {
  const target = event.target
  if (!(target instanceof Element)) {
    return false
  }
  return target === video || video.contains(target) || target.contains(video)
}

/**
 * Shared idle state for the player frame, derived from pointer activity within
 * the active video's subtree. Consumers (density chart, info panel) subscribe
 * once; the underlying tracker follows the active video as it changes without
 * resetting the idle state, so swapping episodes does not flash the consumers
 * back into view.
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
    this.tracker = createIdleTracker(document, {
      shouldCount: (event) => {
        return (
          this.currentVideo !== null &&
          isWithinVideoSubtree(event, this.currentVideo)
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
