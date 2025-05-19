import { match } from 'ts-pattern'

import type { DanmakuService } from '../services/DanmakuService'
import type { IconService } from '../services/IconService'
import type { ProviderService } from '../services/ProviderService'

import { injectVideoScript } from '@/background/scripting/setupScripting'
import type { BilibiliService } from '@/background/services/BilibiliService'
import type { GenAIService } from '@/background/services/GenAIService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { TencentService } from '@/background/services/TencentService'
import { Logger } from '@/common/Logger'
import type { EpisodeSearchParams } from '@/common/danmaku/dto'
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
    seasonSearch: async (input) => {
      return providerService.searchSeason(input)
    },
    mediaParseUrl: async (input) => {
      return providerService.parseUrl(input.url)
    },
    episodeSearch: async (input: EpisodeSearchParams) => {
      return providerService.searchEpisodes(input)
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
    episodeFilter: async (filter) => {
      const result = await danmakuService.filter(filter)
      return result
    },
    episodeFilterLite: async (filter) => {
      const result = await danmakuService.filterLite(filter)
      return result || null
    },
    seasonGetAll: async () => {
      const result = await seasonService.getAll()
      return result
    },
    seasonFilter: async (data) => {
      return seasonService.filter(data)
    },
    seasonDelete: async (data) => {
      return seasonService.delete(data)
    },
    seasonRefresh: async (data) => {
      return providerService.refreshSeason(data)
    },
    episodeFetch: async (data) => {
      const result = await providerService.getDanmaku(data)

      return result
    },
    episodeImport: async (data) => {
      return danmakuService.import(data)
    },
    episodeDelete: async (filter) => {
      return danmakuService.delete(filter)
    },
    episodeFilterCustom: async (filter) => {
      return danmakuService.filterCustom(filter)
    },
    episodeFilterCustomLite: async (filter) => {
      return danmakuService.filterCustomLite(filter)
    },
    episodeDeleteCustom: async (filter) => {
      return danmakuService.deleteCustom(filter)
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
