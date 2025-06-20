import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import { Logger } from '@/common/Logger'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { DanmakuComponent } from '@/content/player/monitors/DanmakuComponent'
import { RectObserver } from '@/content/player/monitors/RectObserver'
import {
  type VideoChangeListener,
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

export class DanmakuManager {
  private readonly renderer = new DanmakuRenderer((node, props) => {
    ReactDOM.createRoot(node).render(createElement(DanmakuComponent, props))
  })
  private readonly nodes: {
    wrapper: HTMLElement
    container: HTMLElement
    stats: HTMLElement
  }

  private parent?: HTMLElement

  public video: HTMLVideoElement | null = null
  private comments: CommentEntity[] = []
  private hasComments = false

  // State
  public isMounted = false
  private isDebug = false

  // Styles
  private rect = new DOMRectReadOnly()

  // Observers
  private videoNodeObs?: VideoNodeObserver
  private rectObs?: RectObserver

  private readonly DEBUG_PLUGIN_NAME = 'danmaku-stats'

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
    const { wrapper, container, stats } = this.createContainers()
    this.nodes = { wrapper, container, stats }
    this.logger = logger.sub('[DanmakuManager]')

    // Setup debugging
    extensionOptionsService.get().then((options) => {
      this.isDebug = options.debug
    })
    extensionOptionsService.onChange((options) => {
      this.isDebug = options.debug
      if (this.isDebug) {
        this.addDebugHighlight()
        this.addDebugStats()
      } else {
        this.removeDebugHighlight()
        this.removeDebugStats()
      }
    })
  }

  start(videoSelector: string) {
    this.logger.debug('Starting')

    this.videoNodeObs = new VideoNodeObserver(videoSelector, {
      onVideoNodeChange: this.handleVideoNodeChange,
      onVideoNodeRemove: this.handleVideoNodeRemove,
    })
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

    const stats = document.createElement('div')
    stats.style.position = 'absolute'
    stats.style.top = '0'
    stats.style.left = '0'
    stats.style.background = 'rgba(0, 0, 0, 0.5)'
    stats.style.color = 'white'
    stats.style.fontFamily = 'monospace'
    stats.style.padding = '8px 16px'
    stats.id = 'danmaku-anywhere-manager-stats'

    wrapper.appendChild(container)

    return { wrapper, container, stats }
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
    this.addDebugHighlight()
    this.nodes.wrapper.style.visibility = 'visible'

    if (this.hasComments) {
      this.createDanmaku()
    }

    this.videoChangeListeners.forEach((listener) => listener(video))
  }

  private handleVideoNodeRemove = (prev: HTMLVideoElement) => {
    this.video = null
    this.teardownObs()
    this.unmount()
    this.nodes.wrapper.style.visibility = 'hidden'
    this.removeDebugHighlight()

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

  private addDebugHighlight() {
    if (!this.isDebug) return
    this.nodes.wrapper.style.border = '1px solid red'
  }

  private removeDebugHighlight() {
    this.nodes.wrapper.style.border = 'none'
  }

  private addDebugStats() {
    const manager = this.renderer.manager
    if (!manager) return
    if (!this.isDebug) return

    this.nodes.container.appendChild(this.nodes.stats)
    const updateDebugStats = (all: number, stash: number, view: number) => {
      this.nodes.stats.innerHTML = `
      <div>All: ${all}</div>
      <div>Stash: ${stash}</div>
      <div>View: ${view}</div>
    `
    }

    const update = () => {
      const { all, view, stash } = manager.len()
      updateDebugStats(all, stash, view)
    }

    manager.use({
      name: this.DEBUG_PLUGIN_NAME,
      push: () => update(),
      clear: () => update(),
      $destroyed: () => update(),
      $beforeMove: () => update(),
    })
  }

  private removeDebugStats() {
    this.nodes.stats.remove()
    const manager = this.renderer.manager
    if (!manager) return
    manager.remove(this.DEBUG_PLUGIN_NAME)
  }

  private createDanmaku() {
    if (!this.video || !this.hasComments) return

    if (!this.isMounted) {
      this.logger.debug('Mounting danmaku')

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
      this.createDanmaku()
      this.addDebugStats()
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
    this.removeDebugStats()
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
