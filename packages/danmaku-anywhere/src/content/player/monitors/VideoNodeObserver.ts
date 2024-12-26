import { tryCatchSync } from '@/common/utils/utils'

const isVideoElement = (node: Node): node is HTMLVideoElement =>
  node instanceof HTMLVideoElement

const isElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement

export type VideoChangeListener = (video: HTMLVideoElement) => void

export class VideoNodeObserver {
  private videoStack: HTMLVideoElement[] = []
  private videoListeners = new WeakMap<HTMLVideoElement, () => void>()
  private activeVideoElement: HTMLVideoElement | null = null
  private rootObs: MutationObserver

  private videoChangeListeners = new Set<VideoChangeListener>()
  private videoRemovedListeners = new Set<VideoChangeListener>()

  constructor(private selector: string) {
    const [current, err] = tryCatchSync<HTMLVideoElement | null>(() =>
      document.querySelector(selector)
    )

    if (err) {
      throw new Error(`Error selecting video element: ${err.message}`)
    }

    if (current) {
      this.handleVideoNodeAdded(current)
    }

    this.rootObs = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (isVideoElement(node)) {
            if (node.matches(selector)) {
              this.handleVideoNodeAdded(node)
            }
          } else if (isElement(node)) {
            const videoElements = node.querySelectorAll(selector)
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

    this.rootObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id'],
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

    // Emit video removed event if the video changed from a non-null value to null
    if (video === null) {
      this.videoRemovedListeners.forEach((listener) => {
        if (this.activeVideoElement) {
          listener(this.activeVideoElement)
        }
      })
    }
    this.activeVideoElement = video
    // Emit video change event if the video changed to a non-null value
    if (video) {
      this.videoChangeListeners.forEach((listener) => listener(video))
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

  private isNodeInPip(node: HTMLElement) {
    if (!window.documentPictureInPicture?.window) return false
    return window.documentPictureInPicture.window.document.contains(node)
  }

  public onActiveNodeChange(callback: VideoChangeListener) {
    this.videoChangeListeners.add(callback)
  }

  public onVideoRemoved(callback: (video: HTMLVideoElement) => void) {
    this.videoRemovedListeners.add(callback)
  }

  public cleanup() {
    this.rootObs.disconnect()
    this.videoChangeListeners.clear()
    this.videoRemovedListeners.clear()
  }
}
