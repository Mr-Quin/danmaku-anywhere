import { match } from 'ts-pattern'

import { DanmakuService } from '../services/DanmakuService'
import { IconService } from '../services/IconService'
import { ProviderService } from '../services/ProviderService'
import { TitleMappingService } from '../services/TitleMappingService'

import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import { RpcException } from '@/common/rpc/types'
import type { BackgroundMethods } from '@/common/rpcClient/background/types'

export const setupRpc = () => {
  const animeService = new ProviderService()
  const iconService = new IconService()
  const danmakuService = new DanmakuService()
  const titleMappingService = new TitleMappingService()

  const rpcServer = createRpcServer<BackgroundMethods>({
    animeSearch: async (input) => {
      const res = await animeService.searchDanDanPlay(input)

      return res
    },
    mediaSearch: async (input) => {
      return animeService.searchByProviders(input.params, input.providers)
    },
    getBilibiliEpisode: async (mediaId) => {
      return animeService.getBiliBiliEpisodes(mediaId)
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
    danmakuGetMany: async (data) => {
      const result = await danmakuService.getMany(data)
      return result
    },
    danmakuGetByAnime: async (data) => {
      const result = await danmakuService.getByAnimeId(data)
      return result
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
    danmakuImport: async (data) => {
      return danmakuService.import(data)
    },
    danmakuDelete: async (data) => {
      return danmakuService.delete(data)
    },
    danmakuDeleteAll: async () => {
      return danmakuService.deleteAll()
    },
    titleMappingSet: async (input) => {
      return titleMappingService.add(input)
    },
    titleMappingGet: async (input) => {
      const result = await titleMappingService.getMappedTitle(
        input.originalTitle,
        input.integration
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
