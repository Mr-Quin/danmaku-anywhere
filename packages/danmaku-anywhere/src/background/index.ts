import type { DanmakuMessage } from '../common/messages/danmakuMessage'

import { addEnabledMenu } from './contextMenu/enabled'
import { AnimeService } from './services/AnimeService'
import { DanmakuService } from './services/DanmakuService'
import { IconService } from './services/IconService'
import { TitleMappingService } from './services/TitleMappingService'
import { setupOptions } from './syncOptions/upgradeOptions'

import type { AnimeMessage } from '@/common/messages/animeMessage'
import type { IconMessage } from '@/common/messages/iconMessage'
import type { MessageOf } from '@/common/messages/message'
import { MessageRouter } from '@/common/messages/MessageRouter'
import type { TitleMappingMessage } from '@/common/messages/titleMappingMessage'
import { Logger } from '@/common/services/Logger'

setupOptions()
addEnabledMenu()

const messageRouter = new MessageRouter()
const animeService = new AnimeService()
const iconService = new IconService(chrome)
const danmakuService = new DanmakuService()
const titleMappingService = new TitleMappingService()

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

    Logger.debug('Icon state set to:', request.state)

    sendResponse({ success: true, payload: {} })
  }
)

messageRouter.on<MessageOf<DanmakuMessage, 'danmaku/fetch'>>(
  'danmaku/fetch',
  async (request, _, sendResponse) => {
    Logger.debug('Fetching danmaku:', request)

    const res = await danmakuService.fetch(
      request.data,
      request.params,
      request.options
    )

    Logger.debug('Fetch danmaku success', res)

    sendResponse({ success: true, payload: res })
  }
)

messageRouter.on<MessageOf<DanmakuMessage, 'danmaku/delete'>>(
  'danmaku/delete',
  async (request, _, sendResponse) => {
    const res = await danmakuService.delete(request.episodeId)

    Logger.debug('Delete danmaku success', res)

    sendResponse({ success: true, payload: res })
  }
)

messageRouter.on<MessageOf<DanmakuMessage, 'danmaku/getAll'>>(
  'danmaku/getAll',
  async (_, __, sendResponse) => {
    const res = await danmakuService.getAll()

    Logger.debug(`Get all danmaku success: ${res.length} records`)

    sendResponse({ success: true, payload: res })
  }
)

messageRouter.on<MessageOf<AnimeMessage, 'anime/search'>>(
  'anime/search',
  async (request, _, sendResponse) => {
    Logger.debug('Search for anime:', request)

    const res = await animeService.search({
      anime: request.anime,
      episode: request.episode,
    })

    Logger.debug('Anime search success', res)

    sendResponse({ success: true, payload: res })
  }
)

messageRouter.on<MessageOf<TitleMappingMessage, 'titleMapping/save'>>(
  'titleMapping/save',
  async (request, _, sendResponse) => {
    Logger.debug('Saving title mapping:', request)

    const res = await titleMappingService.add(request)

    Logger.debug('Title mapping saved', res)

    sendResponse({ success: true, payload: res })
  }
)

messageRouter.on<MessageOf<TitleMappingMessage, 'titleMapping/get'>>(
  'titleMapping/get',
  async (request, _, sendResponse) => {
    Logger.debug('Getting title mapping:', request)

    const res = await titleMappingService.getMappedTitle(
      request.originalTitle,
      request.source
    )

    Logger.debug('Title mapping found', res)

    sendResponse({ success: true, payload: res })
  }
)

chrome.runtime.onMessage.addListener((...args) => {
  Logger.debug('Message received:', args[0])
  return messageRouter.getListener()(...args)
})
