import { Logger as _Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import {
  chromeRpcClient,
  playerRpcClient,
} from '@/common/rpcClient/background/client'
import type { PlayerCommands } from '@/common/rpcClient/background/types'
import { DanmakuManager } from '@/scripts/player/monitors/DanmakuManager'

const Logger = _Logger.sub('[Player]')

const { data: frameId } = await chromeRpcClient.getFrameId()

Logger.debug(`Player script loaded in frame ${frameId}`)

const createPopoverRoot = (id: string) => {
  const root = document.createElement('div')
  root.id = id
  root.style.setProperty('position', 'absolute', 'important')
  root.style.setProperty('z-index', '2147483647', 'important')
  root.style.setProperty('left', '0', 'important')
  root.style.setProperty('top', '0', 'important')

  // make the root element a popover, so it can be shown on top of everything
  root.setAttribute('popover', 'manual')

  // create shadow dom
  const shadowContainer = root.attachShadow({ mode: 'closed' })
  const shadowRoot = document.createElement('div')

  shadowContainer.appendChild(shadowRoot)

  return { root, shadowContainer, shadowRoot }
}

const manager = new DanmakuManager(Logger)

const { root, shadowContainer, shadowRoot } = createPopoverRoot(
  'danmaku-anywhere-player'
)

document.body.append(root)
root.showPopover()

// Listen to fullscreenchange event and keep popover on top
document.addEventListener('fullscreenchange', () => {
  /**
   * When the video enters full screen, hide then show the popover
   * so that it will appear on top of the full screen element,
   * since the last element in the top layer is shown on top
   */
  root.hidePopover()
  root.showPopover()
})

const emotionRoot = document.createElement('style')
shadowContainer.appendChild(emotionRoot)

// prevent global styles from leaking into shadow dom
emotionRoot.textContent = `
  :host {
  all : initial;
  }
  `

manager.setParent(shadowRoot)

const playerRpcServer = createRpcServer<PlayerCommands>(
  {
    mount: async ({ data: comments }) => {
      manager.mount(comments)
    },
    unmount: async () => {
      manager.unmount()
    },
    start: async ({ data: query }) => {
      manager.start(query)
    },
    updateConfig: async ({ data: config }) => {
      manager.updateConfig(config)
    },
    seek: async ({ data: time }) => {
      manager.seek(time)
    },
  },
  {
    logger: Logger,
    context: { frameId },
    filter: (method, data) => {
      console.debug('Filtering data', { method, data })
      return true
    },
  }
)

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

manager.addEventListener('danmakuMounted', (comments) => {
  playerRpcClient.controller.danmakuMounted({ frameId, data: comments })
})

playerRpcServer.listen()

await playerRpcClient.controller.ready({ frameId })
