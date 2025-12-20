import { inject, injectable } from 'inversify'
import { invariant } from '@/common/utils/utils'
import { VideoNodeObserver } from './VideoNodeObserver'

type VideoEventType = keyof HTMLVideoElementEventMap
type VideoEventCallback<
  K extends keyof HTMLVideoElementEventMap = keyof HTMLVideoElementEventMap,
> = (this: HTMLVideoElement, ev: HTMLVideoElementEventMap[K]) => void

type TimeEventCallback = () => void

interface TimeEventData {
  percentage: number
  callback: TimeEventCallback
  triggered: boolean
}

@injectable('Singleton')
export class VideoEventService {
  // External event listeners for the active video element. If the active video element changes,
  // these listeners are moved to the new active video element,
  // or cached until a new active video element is set.
  private videoEventListeners = new Map<
    VideoEventType,
    Set<VideoEventCallback>
  >()
  private timeEventListeners = new Map<TimeEventCallback, Set<TimeEventData>>()

  private activeVideoElement: HTMLVideoElement | null = null

  constructor(
    @inject(VideoNodeObserver)
    private videoNodeObs: VideoNodeObserver
  ) {
    this.setupVideoObserver()
  }

  private setupVideoObserver() {
    this.videoNodeObs.addEventListener('videoNodeChange', (video) => {
      this.handleVideoChange(video)
    })

    this.videoNodeObs.addEventListener('videoNodeRemove', (video) => {
      this.handleVideoRemoved(video)
    })

    if (this.videoNodeObs.activeVideo) {
      this.handleVideoChange(this.videoNodeObs.activeVideo)
    }

    // attach private listener to the video node
    this.addVideoEventListener('timeupdate', (event) =>
      this.handleTimeUpdate.bind(this)(event.target as HTMLVideoElement)
    )
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.activeVideoElement
  }

  public addVideoEventListener<K extends VideoEventType>(
    event: K,
    callback: VideoEventCallback<K>
  ) {
    if (!this.videoEventListeners.has(event)) {
      this.videoEventListeners.set(
        event,
        new Set([callback as VideoEventCallback])
      )
    } else {
      // biome-ignore lint/style/noNonNullAssertion: checked with has()
      this.videoEventListeners.get(event)!.add(callback as VideoEventCallback)
    }

    if (this.activeVideoElement) {
      // If there is an active video element, add the listener to it immediately
      this.activeVideoElement.addEventListener(event, callback)
    }
  }

  public removeVideoEventListener<K extends VideoEventType>(
    event: K,
    callback: VideoEventCallback<K>
  ) {
    if (this.videoEventListeners.has(event)) {
      // If there is an active video element, remove the listener from it
      if (this.activeVideoElement) {
        this.activeVideoElement.removeEventListener(event, callback)
      }
      // biome-ignore lint/style/noNonNullAssertion: checked with has()
      this.videoEventListeners
        .get(event)!
        .delete(callback as VideoEventCallback)
    }
  }

  public onTimeEvent(percentage: number, callback: TimeEventCallback) {
    invariant(
      percentage >= 0 && percentage <= 1,
      'Percentage must be between 0 and 1'
    )

    const timeEvent: TimeEventData = {
      percentage,
      callback,
      triggered: false,
    }

    if (!this.timeEventListeners.has(callback)) {
      this.timeEventListeners.set(callback, new Set([timeEvent]))
    } else {
      // biome-ignore lint/style/noNonNullAssertion: checked with has()
      this.timeEventListeners.get(callback)!.add(timeEvent)
    }
  }

  private handleTimeUpdate(video: HTMLVideoElement) {
    if (this.timeEventListeners.size === 0) {
      return
    }

    const currentTime = video.currentTime
    const duration = video.duration

    if (duration === 0 || isNaN(duration)) {
      return
    }

    const currentPercentage = currentTime / duration

    for (const timeEvents of this.timeEventListeners.values()) {
      timeEvents.forEach((timeEvent) => {
        if (!timeEvent.triggered && currentPercentage >= timeEvent.percentage) {
          timeEvent.triggered = true
          timeEvent.callback()
        }
      })
    }
  }

  private removeListeners(video: HTMLVideoElement) {
    this.videoEventListeners.forEach((listeners, event) => {
      listeners.forEach((listener) => {
        video.removeEventListener(event, listener)
      })
    })
  }

  private handleVideoChange(video: HTMLVideoElement) {
    const prevVideo = this.activeVideoElement
    this.activeVideoElement = video

    if (prevVideo) {
      // Remove all event listeners from the previous active video element
      this.removeListeners(prevVideo)
    }

    // Add all event listeners to the new active video element
    this.videoEventListeners.forEach((listeners, event) => {
      listeners.forEach((listener) => {
        video.addEventListener(event, listener)
      })
    })

    // Reset time event triggers for the new video
    this.resetTimeEventTriggers()
  }

  private resetTimeEventTriggers() {
    this.timeEventListeners.forEach((timeEvents) => {
      timeEvents.forEach((timeEvent) => {
        timeEvent.triggered = false
      })
    })
  }

  private handleVideoRemoved(video: HTMLVideoElement) {
    this.removeListeners(video)
  }

  public cleanup() {
    this.videoEventListeners.clear()
    this.timeEventListeners.clear()
    this.activeVideoElement = null
  }
}
