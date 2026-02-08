import { uiContainer } from '@/common/ioc/uiIoc'
import { Logger as _Logger } from '@/common/Logger'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import { createRpcServer } from '@/common/rpc/server'
import {
  chromeRpcClient,
  playerRpcClient,
} from '@/common/rpcClient/background/client'
import type { PlayerRelayCommands } from '@/common/rpcClient/background/types'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
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

const { data: frameId } = await chromeRpcClient.getFrameId()

const Logger = _Logger.sub(`[Player-${frameId}]`)

Logger.info('Player script loaded')

const videoNodeObserverService = uiContainer.get(VideoNodeObserverService)
const managerService = uiContainer.get(DanmakuManagerService)
const videoEventService = uiContainer.get(VideoEventService)
const videoSkipService = uiContainer.get(VideoSkipService)
const danmakuDensityService = uiContainer.get(DanmakuDensityService)

const { shadowRoot, root } = createPopoverRoot({
  id: PLAYER_ROOT_ID,
})

managerService.setParent(shadowRoot)
injectCss(shadowRoot, [skipButtonCss, densityPlotCss, danmakuComponentCss])

let pipWindow: Window | undefined

const playerRpcServer = createRpcServer<PlayerRelayCommands>(
  {
    'relay:command:mount': async ({ data: comments }) => {
      managerService.mount(comments)
      videoSkipService.setComments(comments)
      danmakuDensityService.setComments(comments)
      return true
    },
    'relay:command:unmount': async () => {
      managerService.unmount()
      videoSkipService.clear()
      danmakuDensityService.clear()
      return true
    },
    'relay:command:start': async ({ data: query }) => {
      managerService.start(query)
    },
    'relay:command:seek': async ({ data: time }) => {
      managerService.seek(time)
    },
    'relay:command:show': async ({ data: show }) => {
      if (show) {
        managerService.show()
      } else {
        managerService.hide()
      }
    },
    'relay:command:enterPip': async () => {
      // TODO: https://github.com/WICG/document-picture-in-picture/issues/97
      pipWindow = await createPipWindow()

      const pipContainer = pipWindow.document.createElement('div')
      pipContainer.style.setProperty('position', 'absolute', 'important')
      pipContainer.style.setProperty('z-index', '2147483647', 'important')
      pipContainer.style.setProperty('left', '0', 'important')
      pipContainer.style.setProperty('top', '0', 'important')

      pipWindow.document.body.appendChild(pipContainer)

      const delayResize = () => {
        setTimeout(() => {
          managerService.resize()
        }, 100)
      }

      const restoreWrapper = moveElement(
        managerService.getWrapper(),
        pipContainer
      )
      const restoreVideo = moveElement(
        managerService.video!,
        pipWindow.document.body
      )

      delayResize()

      pipWindow.addEventListener('pagehide', () => {
        restoreVideo()
        restoreWrapper()
        delayResize()
      })
    },
  },
  {
    logger: Logger,
    context: { frameId },
    filter: (_, data) => {
      if (import.meta.env.DEV) {
        // safety check, frameId should always be present
        if (data.frameId === undefined) throw new Error('frameId is required')
      }
      if (data.frameId !== frameId) {
        Logger.debug(
          `Ignoring message for frame ${data.frameId} in frame ${frameId}`
        )
        return false
      }
      return true
    },
  }
)

/**
 * Lifecycle events
 */
videoNodeObserverService.addEventListener('videoNodeChange', () => {
  playerRpcClient.controller['relay:event:videoChange']({ frameId })
})

videoNodeObserverService.addEventListener('videoNodeRemove', () => {
  // This event is debounced
  playerRpcClient.controller['relay:event:videoRemoved']({ frameId })
})

videoEventService.onTimeEvent(0.5, () => {
  playerRpcClient.controller['relay:event:preloadNextEpisode']({ frameId })
})

/**
 * Storage events
 */
const danmakuOptionsService = uiContainer.get(DanmakuOptionsService)
danmakuOptionsService.onChange((options) => {
  managerService.updateConfig(options)
})

danmakuOptionsService.get().then((options) => {
  managerService.updateConfig(options)
})

const extensionOptionsService = uiContainer.get(ExtensionOptionsService)

extensionOptionsService.get().then((options) => {
  if (options.playerOptions.showSkipButton) {
    videoSkipService.enable()
  } else {
    videoSkipService.disable()
  }
  if (options.playerOptions.showDanmakuTimeline) {
    danmakuDensityService.enable()
  } else {
    danmakuDensityService.disable()
  }
})

extensionOptionsService.onChange((options) => {
  if (options.playerOptions.showSkipButton) {
    videoSkipService.enable()
  } else {
    videoSkipService.disable()
  }
  if (options.playerOptions.showDanmakuTimeline) {
    danmakuDensityService.enable()
  } else {
    danmakuDensityService.disable()
  }
})

/**
 * Window events
 */
document.addEventListener('fullscreenchange', () => {
  /**
   * The last element in the top layer is shown on top.
   * Hiding then showing the popover will make it the last element in the top layer.
   *
   * Do this every time something goes fullscreen, to ensure the popover is always on top.
   */
  root.hidePopover()
  root.showPopover()
  // Then notify the controller so that the controller can also toggle popover to stay on top
  void playerRpcClient.controller['relay:event:showPopover']({ frameId })
})

playerRpcServer.listen(chrome.runtime.onMessage)

Logger.debug('Player script listening')

playerRpcClient.controller['relay:event:playerReady']({ frameId })
  .then(() => {
    void playerRpcClient.controller['relay:event:showPopover']({ frameId })
  })
  .catch((err) => {
    getTrackingService().track('playerInitError', err)
  })
