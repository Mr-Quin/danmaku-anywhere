import { DanmakuMessage } from '../common/messages/danmakuMessage'
import { iconService } from './services/icon'
import { danmakuService } from './services/danmaku'
import { animeService } from './services/anime'
import { defaultMountConfig } from '@/common/constants/mountConfig'
import { logger } from '@/common/logger'
import { MessageOf } from '@/common/messages/message'
import { MessageRouter } from '@/common/messages/MessageRouter'
import { IconMessage } from '@/common/messages/iconMessage'
import { defaultDanmakuOptions } from '@/common/constants/danmakuOptions'
import { AnimeMessage } from '@/common/messages/animeMessage'

chrome.runtime.onInstalled.addListener(async () => {
  // set default config on install, if not exists
  // TODO: add logic to update config when new version is released
  try {
    const { mountConfig } = await chrome.storage.sync.get('mountConfig')
    if (!mountConfig) {
      await chrome.storage.sync.set({ mountConfig: defaultMountConfig })
    }
    const { danmakuOptions } = await chrome.storage.sync.get('danmakuOptions')
    if (!danmakuOptions) {
      await chrome.storage.sync.set({ danmakuOptions: defaultDanmakuOptions })
    }
  } catch (err) {
    logger.error(err)
  }

  logger.info('Danmaku Anywhere Installed')
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

messageRouter.on<MessageOf<AnimeMessage, 'anime/search'>>(
  'anime/search',
  async (request, _, sendResponse) => {
    logger.debug('Search for anime:', request)

    const res = await animeService.search({
      anime: request.anime,
      episode: request.episode,
    })

    logger.debug('Anime search success', res)

    sendResponse({ success: true, payload: res })
  }
)

chrome.runtime.onMessage.addListener((...args) => {
  logger.debug('Message received:', args[0])
  return messageRouter.getListener()(...args)
})
