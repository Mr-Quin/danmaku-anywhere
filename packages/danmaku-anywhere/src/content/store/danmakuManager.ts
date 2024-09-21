import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuManager as DanmakuEngine } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

import { Logger } from '@/common/Logger'
import type {
  DanmakuOptions,
  SafeZones,
} from '@/common/options/danmakuOptions/constant'
import { createSelectors } from '@/common/utils/createSelectors'
import { RectObserver } from '@/content/danmaku/container/monitors/RectObserver'
import type { VideoChangeListener } from '@/content/danmaku/container/monitors/VideoNodeObserver'
import { VideoNodeObserver } from '@/content/danmaku/container/monitors/VideoNodeObserver'
import { VideoSrcObserver } from '@/content/danmaku/container/monitors/VideoSrcObserver'

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
  | 'srcChange'
  | 'danmakuMounted'
  | 'danmakuUnmounted'

interface DanmakuManagerEventCallback {
  videoChange: VideoChangeListener
  videoRemoved: VideoChangeListener
  rectChange: (rect: DOMRectReadOnly) => void
  srcChange: (src: string) => void
  danmakuMounted: (comments: CommentEntity[]) => void
  danmakuUnmounted: () => void
}

export class DanmakuManager {
  private readonly engine = new DanmakuEngine()
  public readonly wrapper: HTMLElement
  private readonly container: HTMLElement

  public video: HTMLVideoElement | null = null
  private comments: CommentEntity[] = []

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
  private srcChangeListeners = new Set<
    DanmakuManagerEventCallback['srcChange']
  >()
  private danmakuMountedListeners = new Set<
    DanmakuManagerEventCallback['danmakuMounted']
  >()
  private danmakuUnmountedListeners = new Set<
    DanmakuManagerEventCallback['danmakuUnmounted']
  >()

  constructor(private logger = Logger.sub('DanmakuManager')) {
    const { wrapper, container } = this.createContainer()
    this.wrapper = wrapper
    this.container = container
  }

  start(videoSelector: string) {
    this.videoNodeObs = new VideoNodeObserver(videoSelector)

    this.videoNodeObs.onActiveNodeChange((videoNode) => {
      this.video = videoNode

      this.cleanupObs()
      this.setupObs()

      this.videoChangeListeners.forEach((listener) => listener(videoNode))
    })

    this.videoNodeObs.onVideoRemoved((prev) => {
      this.video = null
      this.cleanupObs()
      this.unmount()

      this.videoRemovedListeners.forEach((listener) => listener(prev))
    })

    this.video = this.videoNodeObs.activeVideo

    this.setupObs()
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
    wrapper.style.border = import.meta.env.DEV ? '1px solid red' : 'none'
    wrapper.style.boxSizing = 'border-box'

    const container = document.createElement('div')
    container.style.width = '100%'
    container.style.height = '100%'

    wrapper.appendChild(container)

    return { wrapper, container }
  }

  private setupObs() {
    if (this.video) {
      this.rectObs = new RectObserver(this.video)
      this.srcObs = new VideoSrcObserver(this.video)

      this.rectObs.onRectChange(this.handleRectChange)
      this.srcObs.onSrcChange(this.handleSrcChange)
    }
  }

  private cleanupObs() {
    this.rectObs?.cleanup()
    this.srcObs?.cleanup()
  }

  private handleSrcChange = (src: string) => {
    this.srcChangeListeners.forEach((listener) => listener(src))
  }

  private handleRectChange = (rect: DOMRectReadOnly, notify = true) => {
    this.rect = rect
    this.engine.resize()
    this.updateContainerStyles()
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

  mount(comments: CommentEntity[]) {
    if (!this.video) throw new Error('Video node is not ready')
    this.comments = comments

    this.engine.create(this.container, this.video, comments)
    this.danmakuMountedListeners.forEach((listener) => listener(comments))
  }

  unmount() {
    this.engine.destroy()
    this.comments = []
    this.danmakuUnmountedListeners.forEach((listener) => listener())
    this.wrapper.remove()
  }

  render(parent: HTMLElement) {
    // If the wrapper is already in the document, do nothing
    if (this.wrapper.isConnected) return
    parent.appendChild(this.wrapper)
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

  resize() {
    this.handleRectChange(this.rect, false)
  }

  destroy() {
    this.cleanupObs()
    this.videoNodeObs?.cleanup()
    this.unmount()
    this.clearEventListeners()
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
      case 'srcChange':
        this.srcChangeListeners.add(callback as (src: string) => void)
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
      case 'srcChange':
        this.srcChangeListeners.delete(
          callback as DanmakuManagerEventCallback['srcChange']
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

  clearEventListeners() {
    this.videoChangeListeners.clear()
    this.videoRemovedListeners.clear()
    this.rectChangeListeners.clear()
    this.srcChangeListeners.clear()
    this.danmakuMountedListeners.clear()
    this.danmakuUnmountedListeners.clear()
  }
}

interface DanmakuManagerStore {
  manager: DanmakuManager
}

const danmakuManagerStore = create<DanmakuManagerStore>(() => ({
  manager: new DanmakuManager(),
}))

export const useDanmakuManager = createSelectors(danmakuManagerStore)
