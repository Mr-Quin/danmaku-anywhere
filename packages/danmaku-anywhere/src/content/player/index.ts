import { Logger as _Logger } from '@/common/Logger'
import { danmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { createRpcServer } from '@/common/rpc/server'
import {
  chromeRpcClient,
  playerRpcClient,
} from '@/common/rpcClient/background/client'
import type { PlayerRelayCommands } from '@/common/rpcClient/background/types'
import { createPopoverRoot } from '@/content/common/createPopoverRoot'
import { DanmakuManager } from '@/content/player/monitors/DanmakuManager'
import { createPipWindow, moveElement } from '@/content/player/pipUtils'

const { data: frameId } = await chromeRpcClient.getFrameId()

const Logger = _Logger.sub(`[Player-${frameId}]`)

Logger.info('Player script loaded')

const manager = new DanmakuManager(Logger)
const { shadowRoot } = createPopoverRoot('danmaku-anywhere-player')

manager.setParent(shadowRoot)

let pipWindow: Window | undefined

const playerRpcServer = createRpcServer<PlayerRelayCommands>(
  {
    'relay:command:mount': async ({ data: comments }) => {
      manager.mount(comments)
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
let timeout: NodeJS.Timeout

manager.addEventListener('videoChange', () => {
  clearTimeout(timeout)
  playerRpcClient.controller['relay:event:videoChange']({ frameId })
})

manager.addEventListener('videoRemoved', () => {
  // Add a delay to prevent flickering when the video is removed then added again quickly
  timeout = setTimeout(() => {
    playerRpcClient.controller['relay:event:videoRemoved']({ frameId })
  }, 1000)
})

/**
 * Storage events
 */
danmakuOptionsService.onChange((options) => {
  manager.updateConfig(options)
})

manager.updateConfig(await danmakuOptionsService.get())

playerRpcServer.listen()

Logger.debug('Player script listening')

await playerRpcClient.controller['relay:event:playerReady']({ frameId })
