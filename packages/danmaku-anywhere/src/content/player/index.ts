import { Logger as _Logger } from '@/common/Logger'
import { danmakuOptionsService } from '@/common/options/extensionOptions/service'
import { createRpcServer } from '@/common/rpc/server'
import {
  chromeRpcClient,
  playerRpcClient,
} from '@/common/rpcClient/background/client'
import type { PlayerCommands } from '@/common/rpcClient/background/types'
import { createPopoverRoot } from '@/content/common/createPopoverRoot'
import { DanmakuManager } from '@/content/player/monitors/DanmakuManager'

const { data: frameId } = await chromeRpcClient.getFrameId()

const Logger = _Logger.sub(`[Player-${frameId}]`)

Logger.info(`Player script loaded`)

const manager = new DanmakuManager(Logger)
const { shadowRoot } = createPopoverRoot('danmaku-anywhere-player')

manager.setParent(shadowRoot)

const playerRpcServer = createRpcServer<PlayerCommands>(
  {
    mount: async ({ data: comments }) => {
      manager.mount(comments)
      return true
    },
    unmount: async () => {
      manager.unmount()
      return true
    },
    start: async ({ data: query }) => {
      manager.start(query)
    },
    seek: async ({ data: time }) => {
      manager.seek(time)
    },
  },
  {
    logger: Logger,
    context: { frameId },
    filter: (_, data) => {
      Logger.debug('Received message', data)
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
  playerRpcClient.controller.videoChange({ frameId })
})

manager.addEventListener('videoRemoved', () => {
  // Add a delay to prevent flickering when the video is removed then added again quickly
  timeout = setTimeout(() => {
    playerRpcClient.controller.videoRemoved({ frameId })
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

await playerRpcClient.controller.ready({ frameId })
