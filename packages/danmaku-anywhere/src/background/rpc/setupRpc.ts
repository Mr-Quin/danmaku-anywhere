import { match } from 'ts-pattern'

import { AnimeService } from '../services/AnimeService'
import { DanmakuService } from '../services/DanmakuService'
import { IconService } from '../services/IconService'
import { TitleMappingService } from '../services/TitleMappingService'

import type { BackgroundMethods } from '@/common/rpc/interface/background'
import { RpcException } from '@/common/rpc/rpc'
import { createRpcServer } from '@/common/rpc/server'
import { Logger } from '@/common/services/Logger'

export const setupRpc = () => {
  const animeService = new AnimeService()
  const iconService = new IconService()
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
    iconSet: async (data, sender) => {
      if (sender.tab?.id === undefined) {
        throw new RpcException('No tab id found')
      }

      const tabId = sender.tab.id

      match(data)
        .with({ state: 'active' }, (data) => {
          void iconService.setActive(tabId, data.count)
        })
        .with({ state: 'inactive' }, () => {
          void iconService.setNormal(tabId)
        })
        .with({ state: 'available' }, () => {
          void iconService.setNormal(tabId)
        })
        .with({ state: 'unavailable' }, () => {
          void iconService.setUnavailable(tabId)
        })
        .exhaustive()

      Logger.debug('Icon state set to:', data.state)
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
    danmakuCreateCustom: async (data) => {
      return danmakuService.createCustom(data)
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
}
