import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import { Logger } from '@/common/Logger'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { DanmakuComponent } from '@/content/player/components/DanmakuComponent'
import { DebugOverlayService } from '@/content/player/monitors/DebugOverlay.service'
import { RectObserver } from '@/content/player/monitors/RectObserver'
import type {
  VideoChangeListener,
  VideoNodeObserver,
} from '@/content/player/monitors/VideoNodeObserver'

type DanmakuManagerEvents =
  | 'videoChange'
  | 'videoRemoved'
  | 'rectChange'
  | 'danmakuMounted'
  | 'danmakuUnmounted'

interface DanmakuManagerEventCallback {
  videoChange: VideoChangeListener
  videoRemoved: VideoChangeListener
  rectChange: (rect: DOMRectReadOnly) => void
  danmakuMounted: (comments: CommentEntity[]) => void
  danmakuUnmounted: () => void
}

const logger = Logger.sub('[DanmakuManager]')

export class DanmakuManager {
  private readonly renderer = new DanmakuRenderer((node, props) => {
    ReactDOM.createRoot(node).render(createElement(DanmakuComponent, props))
  })
  private readonly nodes: {
    wrapper: HTMLElement
    container: HTMLElement
  }

  private parent?: HTMLElement

  public video: HTMLVideoElement | null = null
  private comments: CommentEntity[] = []
  private hasComments = false

  // State
  public isMounted = false

  // Styles
  private rect = new DOMRectReadOnly()

  // Observers
  private rectObs?: RectObserver

  private debugOverlayService: DebugOverlayService

  // Listeners
  private rectChangeListeners = new Set<
    DanmakuManagerEventCallback['rectChange']
  >()
  private videoChangeListeners = new Set<
    DanmakuManagerEventCallback['videoChange']
  >()
  private videoRemovedListeners = new Set<
    DanmakuManagerEventCallback['videoChange']
  >()
  private danmakuMountedListeners = new Set<
    DanmakuManagerEventCallback['danmakuMounted']
  >()
  private danmakuUnmountedListeners = new Set<
    DanmakuManagerEventCallback['danmakuUnmounted']
  >()

  constructor(private videoNodeObs: VideoNodeObserver) {
    const { wrapper, container } = this.createContainers()
    this.nodes = { wrapper, container }

    this.debugOverlayService = new DebugOverlayService(
      this.renderer,
      this.nodes.wrapper
    )

    extensionOptionsService.get().then((options) => {
      this.debugOverlayService.setDebugEnabled(options.debug)
    })
    extensionOptionsService.onChange((options) => {
      this.debugOverlayService.setDebugEnabled(options.debug)
    })
  }

  start(videoSelector: string) {
    logger.debug('Starting')

    this.videoNodeObs.start(videoSelector)

    this.videoNodeObs.addEventListener(
      'videoNodeChange',
      this.handleVideoNodeChange.bind(this)
    )
    this.videoNodeObs.addEventListener(
      'videoNodeRemove',
      this.handleVideoNodeRemove.bind(this)
    )
  }

  private createContainers() {
    const wrapper = document.createElement('div')
    wrapper.id = 'danmaku-anywhere-manager-container'
    wrapper.style.position = 'absolute'
    wrapper.style.pointerEvents = 'none'
    wrapper.style.top = '0'
    wrapper.style.left = '0'
    wrapper.style.width = '0'
    wrapper.style.height = '0'
    wrapper.style.overflow = 'hidden'
    wrapper.style.border = 'none'
    wrapper.style.boxSizing = 'border-box'

    const container = document.createElement('div')
    container.style.width = '100%'
    container.style.height = '100%'

    wrapper.appendChild(container)

    return { wrapper, container }
  }

  public getWrapper() {
    return this.nodes.wrapper
  }

  private setupObs(video: HTMLVideoElement) {
    this.rectObs = new RectObserver(video)

    this.rectObs.onRectChange(this.handleRectChange)
  }

  private teardownObs() {
    this.rectObs?.cleanup()
    this.rectObs = undefined
  }

  private handleVideoNodeChange = (video: HTMLVideoElement) => {
    this.video = video

    this.teardownObs()
    this.setupObs(video)
    this.nodes.wrapper.style.visibility = 'visible'

    if (this.hasComments) {
      this.createDanmaku()
      this.debugOverlayService.mount()
    }

    this.videoChangeListeners.forEach((listener) => listener(video))
  }

  private handleVideoNodeRemove = (prev: HTMLVideoElement) => {
    this.video = null
    this.teardownObs()
    this.unmount()
    this.nodes.wrapper.style.visibility = 'hidden'

    this.videoRemovedListeners.forEach((listener) => listener(prev))
  }

  private handleRectChange = (rect: DOMRectReadOnly, notify = true) => {
    this.rect = rect
    this.updateContainerStyles()
    this.renderer.resize()
    if (notify) {
      this.rectChangeListeners.forEach((listener) => listener(rect))
    }
  }

  private updateContainerStyles() {
    this.nodes.wrapper.style.top = `${this.rect.top}px`
    this.nodes.wrapper.style.left = `${this.rect.left}px`
    this.nodes.wrapper.style.width = `${this.rect.width}px`
    this.nodes.wrapper.style.height = `${this.rect.height}px`
  }

  private createDanmaku() {
    if (!this.video || !this.hasComments) return

    if (!this.isMounted) {
      logger.debug('Mounting danmaku')

      this.attachContainer()

      this.renderer.create(this.nodes.container, this.video, this.comments)
      this.isMounted = true
      this.danmakuMountedListeners.forEach((listener) =>
        listener(this.comments)
      )
    } else {
      // recreate danmaku if it's already mounted
      // this fixes an issue where danmaku can get "stuck" on the screen
      if (this.renderer.created) this.renderer.destroy()

      this.renderer.create(this.nodes.container, this.video, this.comments)
    }
  }

  mount(comments: CommentEntity[]) {
    this.comments = comments
    this.hasComments = true
    // Allow deferring the creation of danmaku
    // if video is not ready, danmaku will be created when video is ready
    if (this.video) {
      logger.debug('Mounting danmaku')
      this.createDanmaku()
      this.debugOverlayService.mount()
    } else {
      logger.debug('Video is not ready, waiting for video to be ready')
    }
  }

  unmount() {
    // If the danmaku is not mounted, only clear the comments
    if (!this.isMounted) {
      if (this.hasComments) {
        this.hasComments = false
        this.comments = []
      }
      return
    }

    logger.debug('Unmounting danmaku')
    this.debugOverlayService.unmount()
    this.removeContainer()
    this.renderer.destroy()
    this.comments = []
    this.hasComments = false
    this.danmakuUnmountedListeners.forEach((listener) => listener())
    this.isMounted = false
  }

  setParent(parent: HTMLElement) {
    this.parent = parent
    this.parent.appendChild(this.nodes.wrapper)
  }

  updateConfig(config: Partial<DanmakuOptions>) {
    this.renderer.updateConfig(config)
    this.updateContainerStyles()
  }

  seek(time: number) {
    if (this.video) {
      this.video.currentTime = time
    }
  }

  private removeContainer() {
    this.nodes.container.remove()
  }

  private attachContainer() {
    // If the wrapper is already in the document, do nothing
    if (this.nodes.container.isConnected) return
    this.nodes.wrapper.appendChild(this.nodes.container)
  }

  show() {
    this.renderer.show()
  }

  hide() {
    this.renderer.hide()
  }

  resize() {
    this.handleRectChange(this.rect, false)
  }

  stop() {
    logger.debug('Stopping')

    this.teardownObs()
    this.videoNodeObs.stop()
    this.debugOverlayService.unmount()
    this.unmount()
  }

  // Events
  addEventListener<K extends DanmakuManagerEvents>(
    event: K,
    callback: DanmakuManagerEventCallback[K]
  ) {
    switch (event) {
      case 'videoChange':
        this.videoChangeListeners.add(callback as VideoChangeListener)
        break
      case 'videoRemoved':
        this.videoRemovedListeners.add(callback as VideoChangeListener)
        break
      case 'rectChange':
        this.rectChangeListeners.add(
          callback as (rect: DOMRectReadOnly) => void
        )
        break
      case 'danmakuMounted':
        this.danmakuMountedListeners.add(
          callback as (comments: CommentEntity[]) => void
        )
        break
      case 'danmakuUnmounted':
        this.danmakuUnmountedListeners.add(callback as () => void)
        break
    }
  }

  removeEventListener<K extends DanmakuManagerEvents>(
    event: K,
    callback: DanmakuManagerEventCallback[K]
  ) {
    switch (event) {
      case 'videoChange':
        this.videoChangeListeners.delete(
          callback as DanmakuManagerEventCallback['videoChange']
        )
        break
      case 'videoRemoved':
        this.videoRemovedListeners.delete(
          callback as DanmakuManagerEventCallback['videoChange']
        )
        break
      case 'rectChange':
        this.rectChangeListeners.delete(
          callback as DanmakuManagerEventCallback['rectChange']
        )
        break
      case 'danmakuMounted':
        this.danmakuMountedListeners.delete(
          callback as DanmakuManagerEventCallback['danmakuMounted']
        )
        break
      case 'danmakuUnmounted':
        this.danmakuUnmountedListeners.delete(
          callback as DanmakuManagerEventCallback['danmakuUnmounted']
        )
        break
    }
  }
}
