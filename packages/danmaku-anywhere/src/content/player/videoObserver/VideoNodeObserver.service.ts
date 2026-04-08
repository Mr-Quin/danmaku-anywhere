import { injectable } from 'inversify'
import { tryCatchSync } from '@/common/utils/tryCatch'
import { waitForBody } from '@/content/common/host/waitForBody'
import { VideoSrcObserver } from './VideoSrcObserver'
import { VideoStack } from './VideoStack'

// Use nodeName checks instead of instanceof to avoid issues with Custom Elements
// polyfills that replace native constructors (e.g. @webcomponents/custom-elements)
const isVideoElement = (node: Node): node is HTMLVideoElement => {
  return node.nodeName === 'VIDEO'
}

const isElement = (node: Node): node is Element => {
  return node.nodeType === Node.ELEMENT_NODE
}

export type VideoChangeListener = (video: HTMLVideoElement) => void

export type VideoNodeObserverEvent = 'videoNodeChange' | 'videoNodeRemove'

type VideoObserverState =
  | { type: 'inactive' }
  | { type: 'active'; video: HTMLVideoElement }
  | {
      type: 'removing'
      video: HTMLVideoElement
      timerId: ReturnType<typeof setTimeout>
    }

const REMOVE_DEBOUNCE_MS = 500

@injectable('Singleton')
export class VideoNodeObserverService {
  private state: VideoObserverState = { type: 'inactive' }
  private stack = new VideoStack()

  // Throttle videoNodeChange per element — prevents rapid duplicate emissions
  // from multiple MutationObserver callbacks in one frame.
  // WeakMap avoids retaining detached elements.
  private lastChangeTime = new WeakMap<HTMLVideoElement, number>()

  private rootObs: MutationObserver
  private srcObs = new VideoSrcObserver()
  private selector = 'video'

  private eventListeners = new Map<
    VideoNodeObserverEvent,
    Set<VideoChangeListener>
  >()

  constructor() {
    this.rootObs = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (isVideoElement(node) && node.matches(this.selector)) {
            this.handleAdded(node)
          } else if (isElement(node)) {
            node
              .querySelectorAll<HTMLVideoElement>(this.selector)
              .forEach((v) => this.handleAdded(v))
          }
        }

        for (const removedNode of mutation.removedNodes) {
          if (isVideoElement(removedNode)) {
            this.handleRemoved(removedNode)
          } else if (isElement(removedNode)) {
            // snapshot first — remove() mutates the stack
            this.stack.within(removedNode).forEach((v) => this.handleRemoved(v))
          }
        }
      }
    })

    // Src changes are genuine state changes — dispatch without throttle
    this.srcObs.onSrcChange((_, video) =>
      this.dispatch('videoNodeChange', video)
    )
  }

  get activeVideo(): HTMLVideoElement | null {
    return this.state.type === 'active' ? this.state.video : null
  }

  addEventListener(
    event: VideoNodeObserverEvent,
    listener: VideoChangeListener
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    // biome-ignore lint/style/noNonNullAssertion: checked using has
    this.eventListeners.get(event)!.add(listener)
  }

  removeEventListener(
    event: VideoNodeObserverEvent,
    listener: VideoChangeListener
  ): void {
    this.eventListeners.get(event)?.delete(listener)
  }

  /**
   * Begin observing the DOM for video elements matching selector.
   * Waits for document.body if called at document_start in an iframe.
   */
  async start(selector: string): Promise<void> {
    this.selector = selector

    const body = await waitForBody()

    const [existing, err] = tryCatchSync(() =>
      document.querySelectorAll<HTMLVideoElement>(this.selector)
    )
    if (err) {
      throw new Error(`Error selecting video element: ${err.message}`)
    }
    existing?.forEach((v) => this.handleAdded(v))

    this.observeRoot(body)
  }

  stop(): void {
    this.rootObs.disconnect()
    this.srcObs.cleanup()
    this.eventListeners.clear()
    if (this.state.type === 'removing') clearTimeout(this.state.timerId)
    this.stack.clear()
    this.state = { type: 'inactive' }
  }

  private observeRoot(root: Node): void {
    this.rootObs.observe(root, { childList: true, subtree: true })
  }

  private handleAdded(video: HTMLVideoElement): void {
    if (!this.stack.add(video, () => this.updateActive())) {
      return
    }
    this.updateActive()
  }

  private handleRemoved(video: HTMLVideoElement): void {
    if (this.isInPip(video)) {
      return
    }
    if (!this.stack.remove(video)) {
      return
    }
    this.updateActive()
  }

  private updateActive(): void {
    this.setActive(this.stack.selectBest() ?? null)
  }

  // Routes to the appropriate named transition — does no work itself
  private setActive(video: HTMLVideoElement | null): void {
    if (video === null) {
      if (this.state.type === 'active') {
        this.becomeRemoving(this.state.video)
      }
      return
    }

    switch (this.state.type) {
      case 'inactive':
        this.becomeActive(video)
        break

      case 'removing': {
        clearTimeout(this.state.timerId)
        if (this.state.video === video) {
          // Same element re-added (e.g. player re-initialising) — restore
          // active state silently, no re-emit
          this.state = { type: 'active', video }
          this.srcObs.observe(video)
        } else {
          this.becomeActive(video)
        }
        break
      }

      case 'active':
        if (this.state.video !== video) {
          this.becomeActive(video)
        }
        break
    }
  }

  private becomeActive(video: HTMLVideoElement): void {
    this.state = { type: 'active', video }
    this.srcObs.observe(video)
    this.emitChange(video)
  }

  private becomeRemoving(video: HTMLVideoElement): void {
    const timerId = setTimeout(
      () => this.becomeInactive(video),
      REMOVE_DEBOUNCE_MS
    )
    this.state = { type: 'removing', video, timerId }
  }

  private becomeInactive(video: HTMLVideoElement): void {
    this.state = { type: 'inactive' }
    this.srcObs.disconnect()
    this.dispatch('videoNodeRemove', video)
  }

  private emitChange(video: HTMLVideoElement): void {
    const last = this.lastChangeTime.get(video)
    const now = Date.now()
    if (last !== undefined && now - last < 100) {
      return
    }
    this.lastChangeTime.set(video, now)
    this.dispatch('videoNodeChange', video)
  }

  private dispatch(
    event: VideoNodeObserverEvent,
    video: HTMLVideoElement
  ): void {
    this.eventListeners.get(event)?.forEach((l) => l(video))
  }

  private isInPip(node: HTMLElement): boolean {
    if (!window.documentPictureInPicture?.window) {
      return false
    }
    return window.documentPictureInPicture.window.document.contains(node)
  }
}
