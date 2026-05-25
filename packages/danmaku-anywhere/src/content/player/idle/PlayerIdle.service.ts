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

@injectable('Singleton')
export class PlayerIdleService {
  private logger: ILogger
  private tracker: IdleTracker | null = null
  private trackerUnsubscribe: (() => void) | null = null
  private listeners = new Set<Listener>()
  private lastActive = true

  constructor(
    @inject(VideoNodeObserverService)
    private videoNodeObs: VideoNodeObserverService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[PlayerIdleService]')
  }

  start() {
    const current = this.videoNodeObs.activeVideo
    if (current) {
      this.swapTarget(current)
    }
    this.videoNodeObs.addEventListener('videoNodeChange', (video) => {
      this.swapTarget(video)
    })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getActive(): boolean {
    return this.tracker?.getActive() ?? this.lastActive
  }

  private swapTarget(video: HTMLVideoElement) {
    this.logger.debug('Swapping idle tracker target', video)
    this.trackerUnsubscribe?.()
    this.tracker?.destroy()
    this.tracker = createIdleTracker(document, {
      shouldCount: (event) => isWithinVideoSubtree(event, video),
    })
    this.trackerUnsubscribe = this.tracker.subscribe((active) => {
      this.lastActive = active
      for (const listener of this.listeners) {
        listener(active)
      }
    })
    const next = this.tracker.getActive()
    if (next !== this.lastActive) {
      this.lastActive = next
      for (const listener of this.listeners) {
        listener(next)
      }
    }
  }
}
