import { match } from 'ts-pattern'

import { DanmakuService } from '../services/DanmakuService'
import { IconService } from '../services/IconService'
import { ProviderService } from '../services/ProviderService'

import { injectVideoScript } from '@/background/scripting/setupScripting'
import { BilibiliService } from '@/background/services/BilibiliService'
import { GenAIService } from '@/background/services/GenAIService'
import { SeasonService } from '@/background/services/SeasonService'
import { TencentService } from '@/background/services/TencentService'
import { Logger } from '@/common/Logger'
import { mountConfigService } from '@/common/options/mountConfig/service'
import type { TabRPCClientMethod } from '@/common/rpc/client'
import type { RRPServerHandler } from '@/common/rpc/server'
import { createRpcServer } from '@/common/rpc/server'
import type { AnyRPCDef } from '@/common/rpc/types'
import { RpcException } from '@/common/rpc/types'
import type {
  BackgroundMethods,
  PlayerCommands,
  PlayerEvents,
} from '@/common/rpcClient/background/types'
import { relayFrameClient } from '@/common/rpcClient/tab/client'

export const setupRpc = (
  providerService: ProviderService,
  iconService: IconService,
  danmakuService: DanmakuService,
  seasonService: SeasonService,
  aiService: GenAIService,
  bilibiliService: BilibiliService,
  tencentService: TencentService
) => {
  const rpcServer = createRpcServer<BackgroundMethods>({
    seasonSearchDanDanPlay: async (input) => {
      return providerService.searchDanDanPlay(input)
    },
    seasonSearchBilibili: async (input) => {
      return providerService.searchBilibili(input)
    },
    seasonSearchTencent: async (input) => {
      return providerService.searchTencent(input)
    },
    mediaParseUrl: async (input) => {
      return providerService.parseUrl(input.url)
    },
    episodeSearchDanDanPlay: async (seasonId) => {
      return providerService.getDanDanPlayEpisodes(seasonId)
    },
    episodeSearchBilibili: async (seasonId) => {
      return providerService.getBilibiliEpisodes(seasonId)
    },
    episodeSearchTencent: async (seasonId) => {
      return providerService.getTencentEpisodes(seasonId)
    },
    episodeMatch: async (data) => {
      return providerService.findMatchingEpisodes(data)
    },
    bilibiliSetCookies: async () => {
      return bilibiliService.setCookies()
    },
    bilibiliGetLoginStatus: async () => {
      return bilibiliService.getLoginStatus()
    },
    tencentTestCookies: async () => {
      return tencentService.testCookies()
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
    episodeGetAll: async () => {
      return danmakuService.getAll()
    },
    episodeGetAllLite: async () => {
      return danmakuService.getAllLite()
    },
    episodeGetOne: async (filter) => {
      const result = await danmakuService.getOne(filter)
      return result || null
    },
    episodeGetOneLite: async (filter) => {
      const result = await danmakuService.getOneLite(filter)
      return result || null
    },
    episodeGetMany: async (filter) => {
      const result = await danmakuService.getMany(filter)
      return result
    },
    seasonGetAll: async () => {
      const result = await seasonService.getAll()
      return result
    },
    episodeFilter: async (filter) => {
      const result = await danmakuService.filter(filter)
      return result
    },
    episodeFetch: async (data) => {
      const result = await providerService.getDanmaku(data)

      return result
    },
    danmakuCreateCustom: async (data) => {
      return danmakuService.bulkAddCustom(data)
    },
    danmakuImport: async (data) => {
      await danmakuService.bulkUpsert(data)
    },
    episodeDelete: async (filter) => {
      return danmakuService.delete(filter)
    },
    episodeDeleteAll: async () => {
      return danmakuService.deleteAll()
    },
    danmakuPurgeCache: async (days) => {
      return danmakuService.purgeOlderThan(days)
    },
    getAllFrames: async (_, sender) => {
      if (sender.tab?.id === undefined) {
        throw new RpcException('No tab id found')
      }

      const tabId = sender.tab.id

      const frames = await chrome.webNavigation.getAllFrames({ tabId })

      if (!frames) {
        throw new RpcException('No frames found')
      }

      return frames
    },
    getFrameId: async (_, sender) => {
      if (sender.frameId === undefined) {
        throw new RpcException('Sender does not have frame id')
      }

      return sender.frameId
    },
    injectScript: async (frameId, sender) => {
      Logger.debug('Injecting script into frame', { frameId })

      if (sender.tab?.id === undefined) {
        throw new RpcException('No tab id found')
      }

      const tabId = sender.tab.id

      await injectVideoScript(tabId, frameId)
    },
    remoteLog: async (data) => {
      Logger.debug('Remote log:', data)
    },
    getActiveTabUrl: async () => {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })

      const activeTab = tabs[0]

      if (!activeTab) {
        throw new RpcException('No active tab found')
      }

      return activeTab.url!
    },
    mountConfigGetAll: async () => {
      return mountConfigService.getAll()
    },
    mountConfigCreate: async (data) => {
      return mountConfigService.create(data)
    },
    extractTitle: async (input) => {
      return aiService.extractTitle(input)
    },
    getFontList: async () => {
      return chrome.fontSettings.getFontList()
    },
    getPlatformInfo: async () => {
      return chrome.runtime.getPlatformInfo()
    },
    fetchImage: async (src) => {
      const res = await fetch(src)
      const blob = await res.blob()

      const { promise, resolve, reject } = Promise.withResolvers<string>()
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject('failed to convert image to base64')
        }
      }
      return promise
    },
  })

  const passThrough = <TRPCDef extends AnyRPCDef>(
    clientMethod: TabRPCClientMethod<TRPCDef>
  ): RRPServerHandler<TRPCDef> => {
    return async (data, sender, setContext) => {
      // Apparently tab.index can be -1 in some cases, this will cause an error so we need to handle it
      const tabIndex = sender.tab?.index === -1 ? undefined : sender.tab?.index

      const res = await clientMethod(
        data,
        {},
        {
          tabInfo: { windowId: sender.tab?.windowId, index: tabIndex },
          getTab: (tabs) => {
            const tab = tabs.find((tab) => tab.id === sender.tab?.id)
            if (!tab) {
              throw new RpcException('Tab not found')
            }
            return tab
          },
        }
      )
      setContext(res.context)
      return res.data
    }
  }

  const rpcRelay = createRpcServer<PlayerCommands & PlayerEvents>({
    mount: passThrough(relayFrameClient.mount),
    unmount: passThrough(relayFrameClient.unmount),
    start: passThrough(relayFrameClient.start),
    seek: passThrough(relayFrameClient.seek),
    show: passThrough(relayFrameClient.show),
    enterPiP: passThrough(relayFrameClient.enterPiP),
    ready: passThrough(relayFrameClient.ready),
    videoChange: passThrough(relayFrameClient.videoChange),
    videoRemoved: passThrough(relayFrameClient.videoRemoved),
  })

  rpcServer.listen()
  rpcRelay.listen()

  // also listen to external messages
  rpcServer.listen(chrome.runtime.onMessageExternal)
}
