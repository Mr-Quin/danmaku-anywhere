import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { DanmakuRenderer } from '@danmaku-anywhere/danmaku-engine'
import { inject, injectable } from 'inversify'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import { uiContainer } from '@/common/ioc/uiIoc'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type {
  DanmakuOptions,
  OcclusionModel,
  OcclusionQuality,
} from '@/common/options/danmakuOptions/constant'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { SegmentationStats } from '@/common/rpcClient/background/types'
import { injectCss } from '@/content/common/injectCss'
import { DanmakuComponent } from '@/content/player/components/DanmakuComponent'
import { DanmakuLayoutService } from '@/content/player/danmakuLayout/DanmakuLayout.service'
import { RectObserver } from '@/content/player/danmakuManager/RectObserver'
import { DanmakuDebugOverlayService } from '@/content/player/debugOverlay/DanmakuDebugOverlay.service'
import {
  OcclusionService,
  type OcclusionStatus,
} from '@/content/player/occlusion/Occlusion.service'
import { VideoNodeObserverService } from '@/content/player/videoObserver/VideoNodeObserver.service'

const OCCLUSION_QUALITY_PRESETS: Record<
  OcclusionQuality,
  { captureSize: number; minIntervalMs: number; outputMaxSide: number }
> = {
  low: { captureSize: 192, minIntervalMs: 120, outputMaxSide: 256 },
  medium: { captureSize: 256, minIntervalMs: 80, outputMaxSide: 320 },
  high: { captureSize: 256, minIntervalMs: 50, outputMaxSide: 384 },
}

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

  public isMounted = false

  private rect = new DOMRectReadOnly()
  private injectedCss: HTMLElement[] = []

  private rectObs?: RectObserver

  private occlusion = false
  private occlusionConfidence = 0.5
  private occlusionEdgeSoftness = 4
  private occlusionQuality: OcclusionQuality = 'medium'
  private occlusionModel: OcclusionModel = 'people'
  private occlusionStatusListener?: (status: OcclusionStatus) => void
  private debug = false

  constructor(
    @inject(VideoNodeObserverService)
    private videoNodeObs: VideoNodeObserverService,
    @inject(DanmakuLayoutService)
    layoutManager: DanmakuLayoutService,
    @inject(DanmakuDebugOverlayService)
    private debugOverlayService: DanmakuDebugOverlayService,
    @inject(OcclusionService)
    private occlusionService: OcclusionService,
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
        this.debug = options.debug
        this.debugOverlayService.setDebugEnabled(options.debug)
        this.occlusionService.setDebug(options.debug)
      })
      .catch((e) => this.logger.error(e))
    extensionOptionsService.onChange((options) => {
      this.debug = options.debug
      this.debugOverlayService.setDebugEnabled(options.debug)
      this.occlusionService.setDebug(options.debug)
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

    this.videoNodeObs.start(videoSelector).catch((e) => {
      this.logger.error(e)
    })
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
      // recreate to fix danmaku getting "stuck" on screen
      if (this.renderer.created) this.renderer.destroy()

      this.renderer.create(this.nodes.container, this.video, this.comments)
    }
    this.updateOcclusion()
  }

  mount(comments: CommentEntity[]) {
    this.comments = comments
    this.hasComments = true
    if (this.video) {
      this.logger.debug('Mounting danmaku')
      this.createDanmaku()
      this.debugOverlayService.mount()
    } else {
      this.logger.debug('Video is not ready, waiting for video to be ready')
    }
  }

  unmount() {
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
    this.updateOcclusion()
  }

  setParent(parent: HTMLElement) {
    this.parent = parent
    this.parent.appendChild(this.nodes.wrapper)
  }

  updateConfig(config: Partial<DanmakuOptions>) {
    this.cleanupInjectedCss()
    if (config.occlusion !== undefined) {
      this.occlusion = config.occlusion
    }
    if (config.occlusionConfidence !== undefined) {
      this.occlusionConfidence = config.occlusionConfidence
    }
    if (config.occlusionEdgeSoftness !== undefined) {
      this.occlusionEdgeSoftness = config.occlusionEdgeSoftness
    }
    if (config.occlusionQuality !== undefined) {
      this.occlusionQuality = config.occlusionQuality
    }
    if (config.occlusionModel !== undefined) {
      this.occlusionModel = config.occlusionModel
    }
    if (this.parent && config.useCustomCss === true && config.customCss) {
      // TODO: validate css
      this.injectedCss = injectCss(this.parent, [config.customCss])
    }
    this.renderer.updateConfig(config)
    this.updateContainerStyles()
    this.updateOcclusion()
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
    if (this.nodes.container.isConnected) return
    this.nodes.wrapper.appendChild(this.nodes.container)
  }

  show() {
    this.renderer.show()
  }

  hide() {
    this.renderer.hide()
  }

  setOcclusionMaskUrl(url?: string) {
    this.renderer.setOcclusionMaskUrl(url)
  }

  getSegmentationStats(): SegmentationStats {
    const stats = this.occlusionService.getStats()
    return {
      ...stats,
      model: stats.running ? this.occlusionModel : null,
    }
  }

  setOcclusionDebugOverlay(enabled: boolean) {
    this.occlusionService.setDebug(enabled)
  }

  onOcclusionStatus(listener: (status: OcclusionStatus) => void) {
    this.occlusionStatusListener = listener
  }

  private updateOcclusion() {
    const shouldRun = this.occlusion && this.isMounted && this.video !== null
    if (!shouldRun) {
      this.occlusionService.reset()
      return
    }
    const preset = OCCLUSION_QUALITY_PRESETS[this.occlusionQuality]
    // The anime ISNet model is heavier and distortion-sensitive, so it gets an
    // aspect-preserving capture (undistorted, a bit above the model input for
    // clean downscaling) and a slower cadence than the lightweight people
    // segmenter, to avoid saturating the GPU.
    const tuned =
      this.occlusionModel === 'anime'
        ? {
            captureSize: 512,
            capturePreserveAspect: true,
            minIntervalMs: Math.max(preset.minIntervalMs, 500),
            outputMaxSide: preset.outputMaxSide,
          }
        : {
            captureSize: preset.captureSize,
            capturePreserveAspect: false,
            minIntervalMs: preset.minIntervalMs,
            outputMaxSide: preset.outputMaxSide,
          }
    this.occlusionService.configure({
      model: this.occlusionModel,
      ...tuned,
      threshold: this.occlusionConfidence,
      edgeSoftness: this.occlusionEdgeSoftness,
      debug: this.debug,
      applyMask: (url) => this.setOcclusionMaskUrl(url),
      onStatus: (status) => this.occlusionStatusListener?.(status),
    })
    if (this.video) {
      this.occlusionService.start(this.video)
    }
  }

  resize() {
    this.handleRectChange(this.rect, false)
  }

  stop() {
    this.logger.debug('Stopping')

    this.occlusionService.reset()
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
