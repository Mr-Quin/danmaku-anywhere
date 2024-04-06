import { setupContextMenu } from './contextMenu/setupContextMenu'
import { AnimeService } from './services/AnimeService'
import { DanmakuService } from './services/DanmakuService'
import { IconService } from './services/IconService'
import { TitleMappingService } from './services/TitleMappingService'
import { setupScripting } from './setupScripting'
import { setupOptions } from './syncOptions/upgradeOptions'

import type { BackgroundMethods } from '@/common/rpc/interface/background'
import { RpcException } from '@/common/rpc/rpc'
import { createRpcServer } from '@/common/rpc/server'
import { Logger } from '@/common/services/Logger'

setupOptions()
setupContextMenu()
setupScripting()

const animeService = new AnimeService()
const iconService = new IconService(chrome)
const danmakuService = new DanmakuService()
const titleMappingService = new TitleMappingService()

const rpcServer = createRpcServer<BackgroundMethods>({
  animeSearch: async (input) => {
    const res = await animeService.search(input)

    if (!res.success) {
      throw new RpcException(res.errorMessage)
    }

    return res.animes
  },
  iconSet: async (state, sender) => {
    if (sender.tab?.id === undefined) {
      throw new RpcException('No tab id found')
    }

    switch (state) {
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

    Logger.debug('Icon state set to:', state)
  },
  danmakuGetAll: async () => {
    return danmakuService.getAll()
  },
  danmakuGetAllLite: async () => {
    return danmakuService.getAllLite()
  },
  danmakuGetByEpisodeId: async (episodeId) => {
    const result = await danmakuService.getByEpisodeId(episodeId)
    return result || null
  },
  danmakuFetch: async (input) => {
    const result = await danmakuService.fetch(
      input.data,
      input.params,
      input.options
    )

    return result
  },
  danmakuDelete: async (episodeId) => {
    return danmakuService.delete(episodeId)
  },
  titleMappingSet: async (input) => {
    return titleMappingService.add(input)
  },
  titleMappingGet: async (input) => {
    const result = await titleMappingService.getMappedTitle(
      input.originalTitle,
      input.source
    )
    return result || null
  },
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  rpcServer
    .onMessage(message, sender)
    .then((res) => sendResponse(res))
    .catch(Logger.debug)
  return true // return true to indicate that the response will be sent asynchronously
})
