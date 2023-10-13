import { defaultMountConfig } from '@/common/constants'
import { db } from '@/common/db'
import { DanmakuCache } from '@/common/hooks/danmaku/useDanmakuQuery'
import { backgroundLogger } from '@/common/logger'
import { matchConfig } from '@/common/utils'
import { fetchComments } from '@danmaku-anywhere/danmaku-engine'
import Dexie from 'dexie'

chrome.runtime.onInstalled.addListener(async () => {
  // set default config on install
  try {
    await chrome.storage.sync.set({ mountConfig: defaultMountConfig })
  } catch (err) {
    backgroundLogger.error(err)
  }

  backgroundLogger.log('Extension Installed')
})

// chrome.runtime.onStartup.addListener(() => {})

let iconCache: ImageData | null = null
const setActiveIcon = async (tabId: number) => {
  if (iconCache) {
    await chrome.action.setIcon({ imageData: iconCache, tabId })
    return
  }
  try {
    // Fetch the original icon
    const response = await fetch(chrome.runtime.getURL('normal_16.png'))
    const blob = await response.blob()
    const imgBitmap = await createImageBitmap(blob)

    const canvas = new OffscreenCanvas(16, 16)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      backgroundLogger.error('Error getting canvas context')
      return
    }

    // Draw the original icon
    ctx.drawImage(imgBitmap, 0, 0, 16, 16)

    // Define green dot size and position
    const dotRadius = 6 // Size of green dot
    const dotX = 14 // X-position (right corner)
    const dotY = 2 // Y-position (top corner)

    // Draw the green circle overlay
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI)
    ctx.fill()

    const imageData = ctx.getImageData(0, 0, 16, 16)
    iconCache = imageData
    await chrome.action.setIcon({ imageData, tabId })
  } catch (err) {
    backgroundLogger.error('Error overlaying icon:', err)
  }
}

const unsetActiveIcon = async (tabId: number) => {
  await chrome.action.setIcon({ path: 'normal_16.png', tabId })
}

// chrome.storage.onChanged.addListener(async (changes, namespace) => {
//   backgroundLogger.log('storage changed', changes, namespace)
//   if (namespace === 'sync') {
//     const mountConfig = changes.mountConfig
//     if (mountConfig) {
//       const { newValue } = mountConfig
//       // if the config is changed, we need recheck each tab to see if it's supported under the new config
//       const tabs = await chrome.tabs.query({})

//       for (const tab of tabs) {
//         const config = matchConfig(tab.url as string, newValue)
//         if (config?.enabled) {
//           await setActiveIcon(tab.id as number)
//         } else {
//           await unsetActiveIcon(tab.id as number)
//         }
//       }
//     }
//   }
// })

// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//   if (changeInfo.status === 'complete') {
//     const configs = await chrome.storage.sync.get('mountConfig')
//     const config = matchConfig(tab.url as string, configs.mountConfig)

//     // if a config is matched, the website is supported, so we show the active icon
//     if (config?.enabled) {
//       await setActiveIcon(tabId)
//     }
//   }
//   backgroundLogger.log('tab updated', tabId, changeInfo, tab)
// })

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.topic === 'danmaku') {
    if (sender.tab) {
      setActiveIcon(sender.tab.id as number)
    }
  }
})

const dandanplayTable = db.dandanplay

interface Message<T = any> {
  topic: string
  payload: T
}

interface DanDanPlayDanmkuMessage extends Message {
  topic: 'request'
  payload: {
    episodeId: number
  }
}

const handleDanmakuRequest = async (message: Message) => {}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'danmaku') {
    port.onMessage.addListener(async (msg: DanDanPlayDanmkuMessage) => {
      if (msg.topic === 'request') {
        const comments = await fetchComments(msg.payload.episodeId)

        // dandanplayTable.add(comments)
      }
    })
  }
})

dandanplayTable.toCollection().toArray().then(console.log)
