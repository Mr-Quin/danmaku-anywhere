import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuManager as DanmakuEngine } from '@danmaku-anywhere/danmaku-engine'

import { Logger } from '@/common/Logger'
import type {
  DanmakuOptions,
  SafeZones,
} from '@/common/options/danmakuOptions/constant'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { RectObserver } from '@/content/player/monitors/RectObserver'
import {
  type VideoChangeListener,
  VideoNodeObserver,
} from '@/content/player/monitors/VideoNodeObserver'
import { VideoSrcObserver } from '@/content/player/monitors/VideoSrcObserver'

const calculatePaddings = (safeZones: SafeZones, rect?: DOMRectReadOnly) => {
  const { top, bottom } = safeZones

  if (!rect) return { paddingTop: '0px', paddingBottom: '0px' }

  const paddingTop = (rect.height * top) / 100
  const paddingBottom = (rect.height * bottom) / 100

  return {
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
  }
}

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

export class DanmakuManager {
  private readonly engine = new DanmakuEngine()
  public readonly wrapper: HTMLElement
  private readonly container: HTMLElement
  private parent?: HTMLElement

  public video: HTMLVideoElement | null = null
  private comments: CommentEntity[] = []
  private hasComments = false

  // State
  public isMounted = false

  // Styles
  private rect = new DOMRectReadOnly()
  private safeZones?: SafeZones

  // Observers
  private videoNodeObs?: VideoNodeObserver
  private rectObs?: RectObserver
  private srcObs?: VideoSrcObserver

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

  constructor(private logger = Logger) {
    const { wrapper, container } = this.createContainer()
    this.wrapper = wrapper
    this.container = container
    this.logger = logger.sub('[DanmakuManager]')
  }

  start(videoSelector: string) {
    this.logger.debug('Starting')

    this.videoNodeObs = new VideoNodeObserver(videoSelector, {
      onVideoNodeChange: this.handleVideoNodeChange,
      onVideoNodeRemove: this.handleVideoNodeRemove,
    })
  }

  private createContainer() {
    const wrapper = document.createElement('div')
    wrapper.id = 'danmaku-anywhere-container'
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

  private setupObs(video: HTMLVideoElement) {
    this.rectObs = new RectObserver(video)
    this.srcObs = new VideoSrcObserver(video)

    this.rectObs.onRectChange(this.handleRectChange)
    this.srcObs.onSrcChange(this.handleSrcChange)
  }

  private teardownObs() {
    this.rectObs?.cleanup()
    this.srcObs?.cleanup()
    this.rectObs = undefined
    this.srcObs = undefined
  }

  private handleVideoNodeChange = (video: HTMLVideoElement) => {
    this.video = video

    this.teardownObs()
    this.setupObs(video)
    this.addDebugStyles()

    if (this.hasComments) {
      this.createDanmaku()
    }

    this.videoChangeListeners.forEach((listener) => listener(video))
  }

  private handleVideoNodeRemove = (prev: HTMLVideoElement) => {
    this.video = null
    this.teardownObs()
    this.unmount()
    this.removeDebugStyles()

    this.videoRemovedListeners.forEach((listener) => listener(prev))
  }

  private handleSrcChange = (src: string, videoNode: HTMLVideoElement) => {
    // also recreate danmaku if the video src changes
    if (this.hasComments) {
      this.createDanmaku()
    }

    // treat src change as video change and notify listeners
    this.videoChangeListeners.forEach((listener) => listener(videoNode))
  }

  private handleRectChange = (rect: DOMRectReadOnly, notify = true) => {
    this.rect = rect
    this.updateContainerStyles()
    this.engine.resize()
    if (notify) {
      this.rectChangeListeners.forEach((listener) => listener(rect))
    }
  }

  private updateContainerStyles() {
    this.wrapper.style.top = `${this.rect.top}px`
    this.wrapper.style.left = `${this.rect.left}px`
    this.wrapper.style.width = `${this.rect.width}px`
    this.wrapper.style.height = `${this.rect.height}px`

    if (this.safeZones) {
      const paddings = calculatePaddings(this.safeZones, this.rect)
      this.wrapper.style.paddingTop = paddings.paddingTop
      this.wrapper.style.paddingBottom = paddings.paddingBottom
    }
  }

  private async addDebugStyles() {
    const options = await extensionOptionsService.get()
    if (options.debug) {
      this.wrapper.style.border = '1px solid red'
    }
  }

  private removeDebugStyles() {
    this.wrapper.style.border = 'none'
  }

  private createDanmaku() {
    if (!this.video || !this.hasComments) return

    if (!this.isMounted) {
      this.logger.debug('Mounting danmaku')

      this.attachContainer()

      this.engine.create(this.container, this.video, this.comments)
      this.isMounted = true
      this.danmakuMountedListeners.forEach((listener) =>
        listener(this.comments)
      )
    } else {
      // recreate danmaku if it's already mounted
      // this fixes an issue where danmaku can get "stuck" on the screen
      if (this.engine.created) this.engine.destroy()

      this.engine.create(this.container, this.video, this.comments)
    }
  }

  mount(comments: CommentEntity[]) {
    this.comments = comments
    this.hasComments = true
    // Allow deferring the creation of danmaku
    // if video is not ready, danmaku will be created when video is ready
    if (this.video) {
      this.createDanmaku()
    } else {
      this.logger.debug('Video is not ready, waiting for video to be ready')
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

    this.logger.debug('Unmounting danmaku')
    this.removeContainer()
    this.engine.destroy()
    this.comments = []
    this.hasComments = false
    this.danmakuUnmountedListeners.forEach((listener) => listener())
    this.isMounted = false
  }

  setParent(parent: HTMLElement) {
    this.parent = parent
    this.parent.appendChild(this.wrapper)
  }

  updateConfig(config: Partial<DanmakuOptions>) {
    this.safeZones = config.safeZones
    this.engine.updateConfig(config)
    this.updateContainerStyles()
  }

  seek(time: number) {
    if (this.video) {
      this.video.currentTime = time
    }
  }

  private removeContainer() {
    this.container.remove()
  }

  private attachContainer() {
    // If the wrapper is already in the document, do nothing
    if (this.container.isConnected) return
    this.wrapper.appendChild(this.container)
  }

  show() {
    this.engine.show()
  }

  hide() {
    this.engine.hide()
  }

  resize() {
    this.handleRectChange(this.rect, false)
  }

  stop() {
    this.logger.debug('Stopping')

    this.teardownObs()
    this.videoNodeObs?.cleanup()
    this.videoNodeObs = undefined
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
