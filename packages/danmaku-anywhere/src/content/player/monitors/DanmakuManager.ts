import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import { inject, injectable } from 'inversify'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import { uiContainer } from '@/common/ioc/uiIoc'
import { Logger } from '@/common/Logger'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { DanmakuComponent } from '@/content/player/components/DanmakuComponent'
import { DanmakuLayoutManager } from '@/content/player/DanmakuLayoutManager'
import { DanmakuDebugOverlayService } from '@/content/player/monitors/DanmakuDebugOverlay.service'
import { RectObserver } from '@/content/player/monitors/RectObserver'
import { VideoNodeObserver } from '@/content/player/monitors/VideoNodeObserver'

const logger = Logger.sub('[DanmakuManager]')

@injectable()
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

  constructor(
    @inject(VideoNodeObserver)
    private videoNodeObs: VideoNodeObserver,
    @inject(DanmakuLayoutManager)
    layoutManager: DanmakuLayoutManager,
    @inject(DanmakuDebugOverlayService)
    private debugOverlayService: DanmakuDebugOverlayService
  ) {
    this.nodes = {
      wrapper: layoutManager.wrapper,
      container: layoutManager.container,
    }

    this.debugOverlayService.attach(this.renderer)

    const extensionOptionsService = uiContainer.get(ExtensionOptionsService)

    extensionOptionsService
      .get()
      .then((options) => {
        this.debugOverlayService.setDebugEnabled(options.debug)
      })
      .catch(logger.error)
    extensionOptionsService.onChange((options) => {
      this.debugOverlayService.setDebugEnabled(options.debug)
    })
  }

  start(videoSelector: string) {
    logger.debug('Starting')

    this.videoNodeObs.addEventListener(
      'videoNodeChange',
      this.handleVideoNodeChange.bind(this)
    )
    this.videoNodeObs.addEventListener(
      'videoNodeRemove',
      this.handleVideoNodeRemove.bind(this)
    )

    this.videoNodeObs.start(videoSelector)
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
  }

  private handleVideoNodeRemove = (prev: HTMLVideoElement) => {
    this.video = null
    this.teardownObs()
    this.unmount()
    this.nodes.wrapper.style.visibility = 'hidden'
  }

  private handleRectChange = (rect: DOMRectReadOnly, notify = true) => {
    this.rect = rect
    this.updateContainerStyles()
    this.renderer.resize()
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
}
