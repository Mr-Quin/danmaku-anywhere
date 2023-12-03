import { DanmakuMessage } from '../common/messages/danmakuMessage'
import { iconService } from './services/icon'
import { danmakuService } from './services/danmaku'
import { defaultMountConfig } from '@/common/constants'
import { logger } from '@/common/logger'
import { MessageOf } from '@/common/messages/message'
import { MessageRouter } from '@/common/messages/MessageRouter'
import { IconMessage } from '@/common/messages/iconMessage'

chrome.runtime.onInstalled.addListener(async () => {
  // set default config on install
  try {
    await chrome.storage.sync.set({ mountConfig: defaultMountConfig })
  } catch (err) {
    logger.error(err)
  }

  logger.debug('Extension Installed')
})

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
        iconService.setActive(sender.tab.id)
        break
      case 'inactive':
        iconService.setNormal(sender.tab.id)
        break
      case 'available':
        iconService.setNormal(sender.tab.id)
        break
      case 'unavailable':
        iconService.setUnavailable(sender.tab.id)
        break
      default:
        break
    }

    logger.debug('Icon state set to:', request.state)

    sendResponse({ success: true, payload: {} })
  }
)

messageRouter.on<MessageOf<DanmakuMessage, 'danmaku/fetch'>>(
  'danmaku/fetch',
  async (request, _, sendResponse) => {
    logger.debug('Fetching danmaku:', request)

    const res = await danmakuService.fetch(
      request.data,
      request.params,
      request.options
    )

    logger.debug('Fetch danmaku success', res)

    sendResponse({ success: true, payload: res })
  }
)

messageRouter.on<MessageOf<DanmakuMessage, 'danmaku/delete'>>(
  'danmaku/delete',
  async (request, _, sendResponse) => {
    const res = await danmakuService.delete(request.episodeId)

    logger.debug('Delete danmaku success', res)

    sendResponse({ success: true, payload: res })
  }
)

chrome.runtime.onMessage.addListener((...args) => {
  logger.debug('Message received:', args[0])
  return messageRouter.getListener()(...args)
})
