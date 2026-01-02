import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import { inject, injectable } from 'inversify'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import { uiContainer } from '@/common/ioc/uiIoc'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { injectCss } from '@/content/common/injectCss'
import { DanmakuComponent } from '@/content/player/components/DanmakuComponent'
import { DanmakuLayoutService } from '@/content/player/danmakuLayout/DanmakuLayout.service'
import { RectObserver } from '@/content/player/danmakuManager/RectObserver'
import { DanmakuDebugOverlayService } from '@/content/player/debugOverlay/DanmakuDebugOverlay.service'
import { VideoNodeObserverService } from '@/content/player/videoObserver/VideoNodeObserver.service'

@injectable('Singleton')
export class DanmakuManagerService {
  private logger: ILogger

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
  private injectedCss: HTMLElement[] = []

  // Observers
  private rectObs?: RectObserver

  constructor(
    @inject(VideoNodeObserverService)
    private videoNodeObs: VideoNodeObserverService,
    @inject(DanmakuLayoutService)
    layoutManager: DanmakuLayoutService,
    @inject(DanmakuDebugOverlayService)
    private debugOverlayService: DanmakuDebugOverlayService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[DanmakuManagerService]')

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
      .catch((e) => this.logger.error(e))
    extensionOptionsService.onChange((options) => {
      this.debugOverlayService.setDebugEnabled(options.debug)
    })
  }

  start(videoSelector: string) {
    this.logger.debug('Starting')

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
      this.logger.debug('Mounting danmaku')

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
      this.logger.debug('Mounting danmaku')
      this.createDanmaku()
      this.debugOverlayService.mount()
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

    this.cleanupInjectedCss()
    this.logger.debug('Unmounting danmaku')
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
    this.cleanupInjectedCss()
    if (this.parent && config.useCustomCss === true && config.customCss) {
      this.injectedCss = injectCss(this.parent, [config.customCss])
    }
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
    this.videoNodeObs.stop()
    this.debugOverlayService.unmount()
    this.unmount()
  }

  private cleanupInjectedCss() {
    this.injectedCss.forEach((style) => style.remove())
    this.injectedCss = []
  }
}
