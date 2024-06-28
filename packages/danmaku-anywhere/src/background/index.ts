import { configure } from '@danmaku-anywhere/dandanplay-api'

import { setupContextMenu } from './contextMenu/setupContextMenu'
import { AnimeService } from './services/AnimeService'
import { DanmakuService } from './services/DanmakuService'
import { IconService } from './services/IconService'
import { TitleMappingService } from './services/TitleMappingService'
import { setupScripting } from './setupScripting'
import {
  extensionOptionsService,
  setupOptions,
} from './syncOptions/upgradeOptions'

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

// configure dandanplay api on init and when options change
extensionOptionsService.get().then((options) => {
  configure({
    baseUrl: options.danmakuSources.dandanplay.baseUrl,
  })
})

extensionOptionsService.onChange((options) => {
  if (!options) return
  configure({
    baseUrl: options.danmakuSources.dandanplay.baseUrl,
  })
})

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
  danmakuGetOne: async (data) => {
    const result = await danmakuService.getOne(data)
    return result || null
  },
  danmakuFetchDDP: async (data) => {
    const result = await danmakuService.fetchDDP(
      data.meta,
      data.params,
      data.options
    )

    return result
  },
  danmakuCreateManual: async (data) => {
    return danmakuService.createManual(data)
  },
  danmakuDelete: async (data) => {
    return danmakuService.delete(data)
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
