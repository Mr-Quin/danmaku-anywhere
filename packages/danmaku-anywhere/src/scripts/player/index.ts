import { DanmakuManager } from '@/common/danmaku/DanmakuManager'
import { Logger as _Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import {
  chromeRpcClient,
  playerRpcClient,
} from '@/common/rpcClient/background/client'
import type { PlayerCommands } from '@/common/rpcClient/background/types'

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
  'danmaku-anywhere-danmaku-container'
)

document.body.append(root)
root.showPopover()

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
    mount: async ({ data: comments, frameId }) => {
      manager.mount(comments)
    },
    unmount: async () => {
      manager.unmount()
    },
    start: async ({ data: query, frameId }) => {
      Logger.debug('Starting danmaku manager', query)
      manager.start(query)
    },
  },
  {
    logger: Logger,
    context: { frameId },
    filter: (data) => {
      console.debug('Filtering data', data)
      return false
    },
  }
)

manager.addEventListener('videoChange', () => {
  playerRpcClient.controller.onVideoChange()
})

manager.addEventListener('videoRemoved', () => {
  playerRpcClient.controller.onVideoRemoved()
})

playerRpcServer.listen()

await playerRpcClient.controller.onReady(frameId)
