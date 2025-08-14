import { Logger as _Logger } from '@/common/Logger'
import { danmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { createRpcServer } from '@/common/rpc/server'
import {
  chromeRpcClient,
  playerRpcClient,
} from '@/common/rpcClient/background/client'
import type { PlayerRelayCommands } from '@/common/rpcClient/background/types'
import { createPopoverRoot } from '@/content/common/createPopoverRoot'
import { createDanmakuContainers } from '@/content/player/components/createDanmakuContainer'
import { setupCss } from '@/content/player/components/setupCss'
import { DanmakuManager } from '@/content/player/monitors/DanmakuManager'
import { VideoEventService } from '@/content/player/monitors/VideoEvent.service'
import { VideoNodeObserver } from '@/content/player/monitors/VideoNodeObserver'
import { createPipWindow, moveElement } from '@/content/player/pipUtils'
import { VideoSkipService } from '@/content/player/videoSkip/VideoSkip.service'

const { data: frameId } = await chromeRpcClient.getFrameId()

const Logger = _Logger.sub(`[Player-${frameId}]`)

Logger.info('Player script loaded')

const { container, wrapper } = createDanmakuContainers()

const videoNodeObserver = new VideoNodeObserver()
const manager = new DanmakuManager(videoNodeObserver, wrapper, container)
const videoEventService = new VideoEventService(videoNodeObserver)
const videoSkipService = new VideoSkipService(videoEventService, wrapper)

const { shadowRoot } = createPopoverRoot('danmaku-anywhere-player')

manager.setParent(shadowRoot)
setupCss(shadowRoot)

let pipWindow: Window | undefined

const playerRpcServer = createRpcServer<PlayerRelayCommands>(
  {
    'relay:command:mount': async ({ data: comments }) => {
      manager.mount(comments)
      videoSkipService.setComments(comments)
      return true
    },
    'relay:command:unmount': async () => {
      manager.unmount()
      return true
    },
    'relay:command:start': async ({ data: query }) => {
      manager.start(query)
    },
    'relay:command:seek': async ({ data: time }) => {
      manager.seek(time)
    },
    'relay:command:show': async ({ data: show }) => {
      if (show) {
        manager.show()
      } else {
        manager.hide()
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
          manager.resize()
        }, 100)
      }

      const restoreWrapper = moveElement(manager.getWrapper(), pipContainer)
      const restoreVideo = moveElement(manager.video!, pipWindow.document.body)

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
videoNodeObserver.addEventListener('videoNodeChange', () => {
  playerRpcClient.controller['relay:event:videoChange']({ frameId })
})

videoNodeObserver.addEventListener('videoNodeRemove', () => {
  // This event is debounced
  playerRpcClient.controller['relay:event:videoRemoved']({ frameId })
})

videoEventService.onTimeEvent(0.5, () => {
  playerRpcClient.controller['relay:event:preloadNextEpisode']({ frameId })
})

/**
 * Storage events
 */
danmakuOptionsService.onChange((options) => {
  manager.updateConfig(options)
})

danmakuOptionsService.get().then((options) => {
  manager.updateConfig(options)
})

extensionOptionsService.get().then((options) => {
  if (options.playerOptions) {
    videoSkipService.enable()
  }
})

extensionOptionsService.onChange((options) => {
  if (options.playerOptions) {
    videoSkipService.enable()
  } else {
    videoSkipService.disable()
  }
})

playerRpcServer.listen()

Logger.debug('Player script listening')

await playerRpcClient.controller['relay:event:playerReady']({ frameId })
