import { DanmakuManager } from '@/common/danmaku/DanmakuManager'
import { Logger as _Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import type { ManagerCommands } from '@/common/rpcClient/background/types'

const Logger = _Logger.sub('[Frame]')

Logger.debug('Hello, test.ts')

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

const videos = document.querySelectorAll('video')

Logger.debug('Videos', videos)

const manager = new DanmakuManager()

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

const managerServer = createRpcServer<ManagerCommands>({
  mount: async (comments) => {
    manager.mount(comments)
  },
  unmount: async () => {
    manager.unmount()
  },
  start: async (query) => {
    manager.start(query)
  },
})

const listener: Parameters<
  typeof chrome.runtime.onMessage.addListener
>[number] = (message, sender, sendResponse) => {
  Logger.debug('[Test.ts] Message received', message, sender)
  if (managerServer.hasHandler(message.method)) {
    managerServer
      .onMessage(message, sender)
      .then((res) => {
        if (managerServer.hasHandler(message.method)) {
          sendResponse(res)
        }
      })
      .catch(Logger.debug)

    return true
  }
}

chrome.runtime.onMessage.addListener(listener)
