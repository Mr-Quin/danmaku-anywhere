import {
  DanDanCommentAPIParams,
  fetchComments,
} from '@danmaku-anywhere/danmaku-engine'
import { defaultMountConfig } from '@/common/constants'
import { DanmakuMeta, db } from '@/common/db'
import { backgroundLogger } from '@/common/logger'

chrome.runtime.onInstalled.addListener(async () => {
  // set default config on install
  try {
    await chrome.storage.sync.set({ mountConfig: defaultMountConfig })
  } catch (err) {
    backgroundLogger.error(err)
  }

  backgroundLogger.debug('Extension Installed')
})

const getIconBitmap = async (path: string) => {
  const response = await fetch(chrome.runtime.getURL(path))
  const blob = await response.blob()
  return await createImageBitmap(blob)
}

let activeIconCache: ImageData | null = null
const setActiveIcon = async (tabId: number) => {
  if (activeIconCache) {
    await chrome.action.setIcon({ imageData: activeIconCache, tabId })
    return
  }
  try {
    // Fetch the original icon
    const imgBitmap = await getIconBitmap('normal_16.png')

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
    activeIconCache = imageData
    await chrome.action.setIcon({ imageData, tabId })
  } catch (err) {
    backgroundLogger.error('Error overlaying icon:', err)
  }
}

const setUnavailableIcon = async (tabId: number) => {
  const imgBitmap = await getIconBitmap('normal_16.png')

  const canvas = new OffscreenCanvas(16, 16)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    backgroundLogger.error('Error getting canvas context')
    return
  }

  // make the icon gray
  ctx.filter = 'grayscale(100%)'
  ctx.drawImage(imgBitmap, 0, 0, 16, 16)

  const imageData = ctx.getImageData(0, 0, 16, 16)
  await chrome.action.setIcon({ imageData, tabId })
}

const setNormalIcon = async (tabId: number) => {
  await chrome.action.setIcon({ path: 'normal_16.png', tabId })
}

chrome.runtime.onMessage.addListener((request, sender) => {
  // only handle messages from content script
  if (!sender.tab) return true

  switch (request.action) {
    case 'setIcon/unavailable':
      setUnavailableIcon(sender.tab.id as number)
      break
    case 'setIcon/active':
      setActiveIcon(sender.tab.id as number)
      break
    case 'setIcon/available':
      setNormalIcon(sender.tab.id as number)
      break
    default:
      break
  }

  return true
})

const fetchDanmaku = async (
  data: DanmakuMeta,
  params: Partial<DanDanCommentAPIParams> = { withRelated: true },
  options: { forceUpdate?: boolean; cacheOnly?: boolean } = {}
) => {
  const { episodeId } = data

  const result = await db.dandanplay.get(episodeId)

  if (options.cacheOnly) return result
  if (result && !options.forceUpdate) return result

  backgroundLogger.debug('Danmaku not found in db, fetching from server')

  const comments = await fetchComments(episodeId, params)

  // prevent updating db if new result has less comments than the old one
  if (
    result &&
    result.comments.length > 0 &&
    result.comments.length >= comments.comments.length
  ) {
    backgroundLogger.debug('New danmaku has less comments, skip caching')
    return result
  }

  const newEntry = {
    ...comments,
    meta: data,
    params,
    timeUpdated: Date.now(),
    version: 1 + (result?.version ?? 0),
  }

  await db.dandanplay.put(newEntry)

  return result
}

const deleteDanmaku = async (episodeId: number) => {
  return await db.dandanplay.delete(episodeId)
}

type DanmakuMessage =
  | {
      action: 'danmaku/fetch'
      payload: {
        data: DanmakuMeta
        params?: Partial<DanDanCommentAPIParams>
        options?: { forceUpdate?: boolean; cacheOnly?: boolean }
      }
    }
  | {
      action: 'danmaku/delete'
      payload: {
        episodeId: number
      }
    }

chrome.runtime.onMessage.addListener(
  async (request: DanmakuMessage, sender, sendResponse) => {
    switch (request.action) {
      case 'danmaku/fetch':
        ;(async () => {
          backgroundLogger.debug('fetch danmaku', request)

          try {
            const res = await fetchDanmaku(
              request.payload.data,
              request.payload.params,
              request.payload.options
            )

            backgroundLogger.debug('fetch danmaku success', res)

            sendResponse({ type: 'success', payload: res })
          } catch (err: any) {
            backgroundLogger.error('error fetching danmaku', err)
            sendResponse({ type: 'error', payload: err.message })
          }
        })()

        return true
      case 'danmaku/delete':
        ;(async () => {
          backgroundLogger.debug('delete danmaku', request)

          try {
            const res = await deleteDanmaku(request.payload.episodeId)

            backgroundLogger.debug('delete danmaku success', res)

            sendResponse({ type: 'success', payload: res })
          } catch (err: any) {
            backgroundLogger.error(err)
            sendResponse({ type: 'error', payload: err.message })
          }
        })()

        return true
      default:
        break
    }
  }
)
