import { injectable } from 'inversify'
import { tryCatchSync } from '@/common/utils/tryCatch'
import { VideoSrcObserver } from './VideoSrcObserver'

const isVideoElement = (node: Node): node is HTMLVideoElement =>
  node instanceof HTMLVideoElement

const isElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement

export type VideoChangeListener = (video: HTMLVideoElement) => void

export type VideoNodeObserverEvent = 'videoNodeChange' | 'videoNodeRemove'

@injectable('Singleton')
export class VideoNodeObserverService {
  private videoStack: HTMLVideoElement[] = []
  private videoListeners = new WeakMap<HTMLVideoElement, () => void>()
  private activeVideoElement: HTMLVideoElement | null = null

  private rootObs: MutationObserver
  private srcObs = new VideoSrcObserver()

  private selector = 'video'

  private eventMap = new Map<VideoNodeObserverEvent, Set<VideoChangeListener>>()
  private eventLastEmitted = new Map<VideoNodeObserverEvent, number>()
  private videoNodeRemovedTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.rootObs = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (isVideoElement(node)) {
            if (node.matches(this.selector)) {
              this.handleVideoNodeAdded(node)
            }
          } else if (isElement(node)) {
            const videoElements = node.querySelectorAll(this.selector)
            videoElements.forEach((video) => {
              this.handleVideoNodeAdded(video as HTMLVideoElement)
            })
          }
        }

        for (const removedNode of mutation.removedNodes) {
          if (isVideoElement(removedNode)) {
            if (this.videoStack.includes(removedNode)) {
              this.handleVideoNodeRemoved(removedNode)
            }
          } else if (isElement(removedNode)) {
            // If the removed node is a parent of the video element, remove the video element
            if (this.videoStack.some((v) => removedNode.contains(v))) {
              this.videoStack.forEach((v) => {
                if (removedNode.contains(v)) {
                  this.handleVideoNodeRemoved(v)
                }
              })
            }
          }
        }
      }
    })

    this.srcObs.onSrcChange((_, video) => {
      this.emitEvent('videoNodeChange', video)
    })
  }

  get activeVideo() {
    return this.activeVideoElement
  }

  private updateActiveNode() {
    if (this.videoStack.length === 0) {
      this.setActiveVideoElement(null)
      return
    }

    // Set the active video element in this priority:
    // 1. The first video element that is playing and visible
    // 2. The first video element that is playing
    // 3. The first video element that is visible
    // 4. The first video element
    const activeVideo =
      this.videoStack.find((v) => !v.paused && v.checkVisibility()) ||
      this.videoStack.find((v) => !v.paused) ||
      this.videoStack.find((v) => v.checkVisibility()) ||
      this.videoStack[0]

    this.setActiveVideoElement(activeVideo)
  }

  private setActiveVideoElement(video: HTMLVideoElement | null) {
    if (this.activeVideoElement === video) return

    const prevVideo = this.activeVideoElement
    this.activeVideoElement = video
    this.srcObs.disconnect()

    // Emit video removed event if the video changed from a non-null value to null
    if (video === null) {
      if (prevVideo) {
        this.emitEvent('videoNodeRemove', prevVideo)
      }
    } else {
      // Emit video change event if the video changed to a non-null value
      this.emitEvent('videoNodeChange', video)
      // Move observer to the new video element
      this.srcObs.observe(video)
    }
  }

  private handleVideoNodeAdded(node: HTMLVideoElement) {
    if (this.videoStack.includes(node)) return

    this.videoStack.push(node)
    this.updateActiveNode()

    const listener = () => {
      this.updateActiveNode()
    }

    node.addEventListener('play', listener)
    node.addEventListener('pause', listener)
    this.videoListeners.set(node, listener)
  }

  private handleVideoNodeRemoved(node: HTMLVideoElement) {
    // Check if the node is part of the picture-in-picture window
    // If so, assume it was moved to pip and don't consider it removed
    if (this.isNodeInPip(node)) return
    const index = this.videoStack.indexOf(node)
    if (index !== -1) {
      this.videoStack.splice(index, 1)
    }

    this.updateActiveNode()

    const listener = this.videoListeners.get(node)
    if (listener) {
      node.removeEventListener('play', listener)
      node.removeEventListener('pause', listener)
      this.videoListeners.delete(node)
    }
  }

  private emitEvent(event: VideoNodeObserverEvent, video: HTMLVideoElement) {
    const lastEmitted = this.eventLastEmitted.get(event) || 0
    const now = Date.now()

    // Throttle events to avoid excessive calls
    if (now - lastEmitted < 100) return

    if (event === 'videoNodeRemove') {
      // Debounce the videoNodeRemove event to allow for potential re-adding of the node
      // This event is only called if it's the last event, and no other events are emitted within a short time
      this.videoNodeRemovedTimeout = setTimeout(() => {
        this.eventLastEmitted.set(event, now)
        this.eventMap.get(event)?.forEach((listener) => listener(video))
      }, 500)
    } else {
      if (this.videoNodeRemovedTimeout) {
        clearTimeout(this.videoNodeRemovedTimeout)
        this.videoNodeRemovedTimeout = null
      }
      this.eventLastEmitted.set(event, now)
      this.eventMap.get(event)?.forEach((listener) => listener(video))
    }
  }

  private isNodeInPip(node: HTMLElement) {
    if (!window.documentPictureInPicture?.window) return false
    return window.documentPictureInPicture.window.document.contains(node)
  }

  public addEventListener(
    event: VideoNodeObserverEvent,
    listener: VideoChangeListener
  ) {
    if (!this.eventMap.has(event)) {
      this.eventMap.set(event, new Set())
    }

    // biome-ignore lint/style/noNonNullAssertion: checked using has
    this.eventMap.get(event)!.add(listener)
  }

  public removeEventListener(
    event: VideoNodeObserverEvent,
    listener: VideoChangeListener
  ) {
    if (this.eventMap.has(event)) {
      // biome-ignore lint/style/noNonNullAssertion: checked using has
      this.eventMap.get(event)!.delete(listener)
    }
  }

  public start(selector: string) {
    this.selector = selector

    const [current, err] = tryCatchSync<HTMLVideoElement | null>(() =>
      document.querySelector(this.selector)
    )

    if (err) {
      throw new Error(`Error selecting video element: ${err.message}`)
    }

    if (current) {
      this.handleVideoNodeAdded(current)
    }

    this.rootObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id'],
    })
  }

  public stop() {
    this.rootObs.disconnect()
    this.srcObs.cleanup()
    this.eventMap.clear()
  }
}
