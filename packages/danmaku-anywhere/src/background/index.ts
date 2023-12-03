import {
  DanDanCommentAPIParams,
  fetchComments,
} from '@danmaku-anywhere/danmaku-engine'
import { DanmakuMessage } from '../common/messages/danmakuMessage'
import { defaultMountConfig } from '@/common/constants'
import { DanmakuMeta, db } from '@/common/db'
import { backgroundLogger } from '@/common/logger'
import { MessageOf } from '@/common/messages/message'
import { MessageRouter } from '@/common/messages/MessageRouter'
import { IconMessage } from '@/common/messages/iconMessage'

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

  backgroundLogger.debug('Danmaku fetched from server', comments)

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

  backgroundLogger.debug('Cached danmaku to db')

  await db.dandanplay.put(newEntry)

  return comments
}

const deleteDanmaku = async (episodeId: number) => {
  return await db.dandanplay.delete(episodeId)
}

const messageRouter = new MessageRouter()

messageRouter.on<MessageOf<IconMessage, 'icon/set'>>(
  'icon/set',
  async (request, sender, sendResponse) => {
    // only handle messages from content script
    if (sender.tab?.id === undefined) {
      sendResponse({ success: false, error: 'No tab id found' })
      return
    }

    switch (request.state) {
      case 'active':
        setActiveIcon(sender.tab.id)
        break
      case 'inactive':
        setNormalIcon(sender.tab.id)
        break
      case 'available':
        setNormalIcon(sender.tab.id)
        break
      case 'unavailable':
        setUnavailableIcon(sender.tab.id)
        break
      default:
        break
    }

    backgroundLogger.debug('Icon state set to:', request.state)

    sendResponse({ success: true, payload: {} })
  }
)

messageRouter.on<MessageOf<DanmakuMessage, 'danmaku/fetch'>>(
  'danmaku/fetch',
  async (request, _, sendResponse) => {
    backgroundLogger.debug('Fetching danmaku:', request)

    const res = await fetchDanmaku(
      request.data,
      request.params,
      request.options
    )

    backgroundLogger.debug('Fetch danmaku success', res)

    sendResponse({ success: true, payload: res })
  }
)

messageRouter.on<MessageOf<DanmakuMessage, 'danmaku/delete'>>(
  'danmaku/delete',
  async (request, _, sendResponse) => {
    const res = await deleteDanmaku(request.episodeId)

    backgroundLogger.debug('Delete danmaku success', res)

    sendResponse({ success: true, payload: res })
  }
)

chrome.runtime.onMessage.addListener((...args) => {
  backgroundLogger.debug('Message received:', args[0])
  return messageRouter.getListener()(...args)
})
