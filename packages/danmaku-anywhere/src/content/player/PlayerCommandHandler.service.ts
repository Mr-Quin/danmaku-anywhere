import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { createRpcServer } from '@/common/rpc/server'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PlayerRelayCommands } from '@/common/rpcClient/background/types'
import { createPopoverRoot } from '@/content/common/host/createPopoverRoot'
import { injectCss } from '@/content/common/injectCss'
import danmakuComponentCss from '@/content/player/components/DanmakuComponent.css?inline'
import skipButtonCss from '@/content/player/components/SkipButton/SkipButton.css?inline'
import { PLAYER_ROOT_ID } from '@/content/player/constants/rootId'
import { DanmakuManagerService } from '@/content/player/danmakuManager/DanmakuManager.service'
import { DanmakuDensityService } from '@/content/player/densityPlot/DanmakuDensity.service'
import densityPlotCss from '@/content/player/densityPlot/DanmakuDensityChart.css?inline'
import { createPipWindow, moveElement } from '@/content/player/pipUtils'
import { VideoEventService } from '@/content/player/videoEvent/VideoEvent.service'
import { VideoNodeObserverService } from '@/content/player/videoObserver/VideoNodeObserver.service'
import { VideoSkipService } from '@/content/player/videoSkip/VideoSkip.service'
import { reparentPopover } from '../common/reparentPopover'

interface StartContext {
  frameId: number
  query: string
  sendPlayerReady: () => void
}

@injectable('Singleton')
export class PlayerCommandHandler {
  private logger: ILogger
  private frameId = -1
  private root!: HTMLDivElement
  private enableFullscreenInteraction = true
  private sendPlayerReady: () => void = () => {
    // no-op, replace in start()
  }

  constructor(
    @inject(DanmakuManagerService) private manager: DanmakuManagerService,
    @inject(VideoNodeObserverService)
    private videoNodeObs: VideoNodeObserverService,
    @inject(VideoEventService) private videoEvent: VideoEventService,
    @inject(VideoSkipService) private videoSkip: VideoSkipService,
    @inject(DanmakuDensityService) private density: DanmakuDensityService,
    @inject(DanmakuOptionsService)
    private danmakuOptions: DanmakuOptionsService,
    @inject(ExtensionOptionsService)
    private extensionOptions: ExtensionOptionsService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[PlayerCommandHandler]')
  }

  /**
   * Initialize DOM, wire events, create the full RPC server, and start video detection.
   */
  async start(ctx: StartContext) {
    this.frameId = ctx.frameId
    this.sendPlayerReady = ctx.sendPlayerReady

    await this.setupDom()
    this.wireLifecycleEvents()
    this.wireStorageEvents()
    this.wireWindowEvents()
    this.createRpcServer()

    this.manager.start(ctx.query)
  }

  private async setupDom() {
    const { root, shadowRoot } = await createPopoverRoot({ id: PLAYER_ROOT_ID })
    this.root = root

    this.manager.setParent(shadowRoot)
    injectCss(shadowRoot, [skipButtonCss, densityPlotCss, danmakuComponentCss])
  }

  private wireLifecycleEvents() {
    this.videoNodeObs.addEventListener('videoNodeChange', (video) => {
      playerRpcClient.controller['relay:event:videoChange']({
        frameId: this.frameId,
        data: {
          src: video.src || video.currentSrc,
          width: video.clientWidth,
          height: video.clientHeight,
          playing: !video.paused,
          muted: video.muted,
        },
      })
    })

    this.videoNodeObs.addEventListener('videoNodeRemove', () => {
      playerRpcClient.controller['relay:event:videoRemoved']({
        frameId: this.frameId,
      })
    })

    for (const event of ['play', 'pause', 'volumechange'] as const) {
      this.videoEvent.addVideoEventListener(event, () => {
        const video = this.videoEvent.getVideoElement()
        if (video) this.sendVideoState(video)
      })
    }

    this.videoEvent.onTimeEvent(0.5, () => {
      playerRpcClient.controller['relay:event:preloadNextEpisode']({
        frameId: this.frameId,
      })
    })
  }

  private sendVideoState(video: HTMLVideoElement) {
    void playerRpcClient.controller['relay:event:videoStateChange']({
      frameId: this.frameId,
      data: {
        playing: !video.paused,
        muted: video.muted,
      },
    })
  }

  private wireStorageEvents() {
    this.danmakuOptions.onChange((options) => {
      this.manager.updateConfig(options)
    })
    this.danmakuOptions.get().then((options) => {
      this.manager.updateConfig(options)
    })

    this.extensionOptions.get().then((options) => {
      this.applyExtensionOptions(options)
    })
    this.extensionOptions.onChange((options) => {
      this.applyExtensionOptions(options)
    })
  }

  private applyExtensionOptions(options: {
    playerOptions: {
      showSkipButton: boolean
      showDanmakuTimeline: boolean
      enableFullscreenInteraction: boolean
    }
  }) {
    if (options.playerOptions.showSkipButton) {
      this.videoSkip.enable()
    } else {
      this.videoSkip.disable()
    }
    if (options.playerOptions.showDanmakuTimeline) {
      this.density.enable()
    } else {
      this.density.disable()
    }
    this.enableFullscreenInteraction =
      options.playerOptions.enableFullscreenInteraction
  }

  private wireWindowEvents() {
    document.addEventListener('fullscreenchange', () => {
      if (this.enableFullscreenInteraction) {
        reparentPopover(this.root, document, document.fullscreenElement)
      } else {
        reparentPopover(this.root, document, null)
      }
      void playerRpcClient.controller['relay:event:showPopover']({
        frameId: this.frameId,
      })
    })

    this.wireInteractionProxy()
  }

  /**
   * Forward user interaction events to the controller so the FAB
   * shows/hides correctly when the user interacts inside an iframe.
   * Only active for iframe frames (frameId > 0) since the main frame
   * already has direct event listeners on its own window.
   */
  private wireInteractionProxy() {
    if (this.frameId === 0) {
      return
    }

    let lastSent = 0
    const THROTTLE_MS = 1000

    const sendInteraction = () => {
      const now = Date.now()
      if (now - lastSent < THROTTLE_MS) {
        return
      }
      lastSent = now
      void playerRpcClient.controller['relay:event:userInteraction'](
        { frameId: this.frameId },
        { silent: true, optional: true }
      )
    }

    document.addEventListener('mousemove', sendInteraction, { capture: true })
    document.addEventListener('click', sendInteraction, { capture: true })
    document.addEventListener('touchmove', sendInteraction, {
      capture: true,
      passive: true,
    })
  }

  /**
   * Full RPC server, replaces the lite server after handshake
   */
  private createRpcServer() {
    const server = createRpcServer<PlayerRelayCommands>(
      {
        'relay:command:start': async ({ data: query }) => {
          // Already started — idempotent
          this.manager.start(query)
        },
        'relay:command:mount': async ({ data: comments }) => {
          this.mount(comments)
          return true
        },
        'relay:command:unmount': async () => {
          this.unmount()
          return true
        },
        'relay:command:seek': async ({ data: time }) => {
          this.manager.seek(time)
        },
        'relay:command:show': async ({ data: show }) => {
          if (show) {
            this.manager.show()
          } else {
            this.manager.hide()
          }
        },
        'relay:command:controllerReady': async () => {
          this.logger.debug('Controller ready, re-sending playerReady')
          this.sendPlayerReady()
        },
        'relay:command:enterPip': async () => {
          await this.enterPip()
        },
        'relay:command:debugSkipButton': async () => {
          this.videoSkip.debugShowSkipButton()
        },
      },
      {
        logger: this.logger,
        context: { frameId: this.frameId },
        filter: (method, data) => {
          if (method === 'relay:command:controllerReady') return true
          if (import.meta.env.DEV) {
            if (data.frameId === undefined)
              throw new Error('frameId is required')
          }
          if (data.frameId !== this.frameId) return false
          return true
        },
      }
    )

    server.listen(chrome.runtime.onMessage)
  }

  private mount(comments: CommentEntity[]) {
    this.manager.mount(comments)
    this.videoSkip.setComments(comments)
    this.density.setComments(comments)
  }

  private unmount() {
    this.manager.unmount()
    this.videoSkip.clear()
    this.density.clear()
  }

  private async enterPip() {
    const pipWindow = await createPipWindow()

    const pipContainer = pipWindow.document.createElement('div')
    pipContainer.style.setProperty('position', 'absolute', 'important')
    pipContainer.style.setProperty('z-index', '2147483647', 'important')
    pipContainer.style.setProperty('left', '0', 'important')
    pipContainer.style.setProperty('top', '0', 'important')

    pipWindow.document.body.appendChild(pipContainer)

    const delayResize = () => {
      setTimeout(() => {
        this.manager.resize()
      }, 100)
    }

    const restoreWrapper = moveElement(this.manager.getWrapper(), pipContainer)
    const restoreVideo = moveElement(
      this.manager.video!,
      pipWindow.document.body
    )

    delayResize()

    pipWindow.addEventListener('pagehide', () => {
      restoreVideo()
      restoreWrapper()
      delayResize()
    })
  }
}
