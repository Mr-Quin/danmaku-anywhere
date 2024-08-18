import { match } from 'ts-pattern'

import { DanmakuService } from '../services/DanmakuService'
import { IconService } from '../services/IconService'
import { ProviderService } from '../services/ProviderService'

import { BilibiliService } from '@/background/services/BilibiliService'
import type { GetEpisodeDto } from '@/common/anime/dto'
import { Logger } from '@/common/Logger'
import { createRpcServer } from '@/common/rpc/server'
import { RpcException } from '@/common/rpc/types'
import type { BackgroundMethods } from '@/common/rpcClient/background/types'

export const setupRpc = () => {
  const providerService = new ProviderService()
  const iconService = new IconService()
  const danmakuService = new DanmakuService()
  const bilibiliService = new BilibiliService()

  const rpcServer = createRpcServer<BackgroundMethods>({
    mediaSearch: async (input) => {
      return providerService.searchByProvider(input.provider, input.params)
    },
    mediaSearchMultiple: async (input) => {
      return providerService.searchByProviders(input.params, input.providers)
    },
    episodesGet: async (data: GetEpisodeDto) => {
      return providerService.getEpisodes(data)
    },
    episodeMatch: async (data) => {
      return providerService.findMatchingEpisodes(data)
    },
    bilibiliSetCookies: async () => {
      return bilibiliService.setCookies()
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
    danmakuFetch: async (data) => {
      const result = await danmakuService.getDanmaku(data)

      return result
    },
    danmakuCreateCustom: async (data) => {
      return danmakuService.insertCustom(data)
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
  })

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    rpcServer
      .onMessage(message, sender)
      .then((res) => sendResponse(res))
      .catch(Logger.debug)
    return true // return true to indicate that the response will be sent asynchronously
  })
}
