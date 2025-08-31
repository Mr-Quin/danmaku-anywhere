import { setRequestHeaderRule } from '@danmaku-anywhere/web-scraper'
import { match } from 'ts-pattern'
import { injectVideoScript } from '@/background/scripting/setupScripting'
import type { BilibiliService } from '@/background/services/BilibiliService'
import type { GenAIService } from '@/background/services/GenAIService'
import type { KazumiService } from '@/background/services/KazumiService'
import type { MacCmsProviderService } from '@/background/services/MacCmsProviderService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { TencentService } from '@/background/services/TencentService'
import type { TitleMappingService } from '@/background/services/TitleMappingService'
import { invalidateContentScriptData } from '@/background/utils/invalidateContentScriptData'
import type { EpisodeSearchParams } from '@/common/danmaku/dto'
import { Logger } from '@/common/Logger'
import { mountConfigService } from '@/common/options/mountConfig/service'
import type { TabRPCClientMethod } from '@/common/rpc/client'
import type { RRPServerHandler } from '@/common/rpc/server'
import { createRpcServer } from '@/common/rpc/server'
import type { AnyRPCDef } from '@/common/rpc/types'
import { RpcException } from '@/common/rpc/types'
import type {
  BackgroundMethods,
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import { relayFrameClient } from '@/common/rpcClient/controller/client'
import { getOrFetchCachedImage } from '@/images/cache'
import type { DanmakuService } from '../services/DanmakuService'
import type { IconService } from '../services/IconService'
import type { ProviderService } from '../services/ProviderService'

export const setupRpc = (
  providerService: ProviderService,
  iconService: IconService,
  danmakuService: DanmakuService,
  seasonService: SeasonService,
  aiService: GenAIService,
  bilibiliService: BilibiliService,
  tencentService: TencentService,
  kazumiService: KazumiService,
  titleMappingService: TitleMappingService,
  customProviderService: MacCmsProviderService
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
    seasonMapAdd: async (data) => {
      return titleMappingService.add(data)
    },
    seasonMapGetAll: async () => {
      return titleMappingService.getAll()
    },
    episodeFetch: async (data, sender) => {
      const result = await providerService.getDanmaku(data)
      void invalidateContentScriptData(sender.tab?.id)
      return result
    },
    episodePreloadNext: async (data, sender) => {
      return await providerService.preloadNextEpisode(data)
    },
    episodeImport: async (data, sender) => {
      const result = await danmakuService.import(data)
      void invalidateContentScriptData(sender.tab?.id)
      return result
    },
    episodeDelete: async (filter, sender) => {
      const result = await danmakuService.delete(filter)
      void invalidateContentScriptData(sender.tab?.id)
      return result
    },
    episodeFilterCustom: async (filter) => {
      return danmakuService.filterCustom(filter)
    },
    episodeFilterCustomLite: async (filter) => {
      return danmakuService.filterCustomLite(filter)
    },
    episodeDeleteCustom: async (filter, sender) => {
      const result = await danmakuService.deleteCustom(filter)
      void invalidateContentScriptData(sender.tab?.id)
      return result
    },
    danmakuPurgeCache: async (days, sender) => {
      const result = await danmakuService.purgeOlderThan(days)
      void invalidateContentScriptData(sender.tab?.id)
      return result
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

      return activeTab?.url ?? null
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
    fetchImage: async ({ src, options }) => {
      return getOrFetchCachedImage(src, options)
    },
    kazumiSearchContent: async ({ keyword, policy }) => {
      return kazumiService.searchContent(keyword, policy)
    },
    kazumiGetChapters: async ({ url, policy }) => {
      return kazumiService.getChapters(url, policy)
    },
    genericVodSearch: async ({ baseUrl, keyword }) => {
      return customProviderService.search(baseUrl, keyword)
    },
    genericFetchDanmakuForUrl: async ({ title, url }) => {
      return customProviderService.fetchDanmakuForUrl(title, url)
    },
    setHeaders: async (rule) => {
      await setRequestHeaderRule(rule)
    },
    openPopupInNewWindow: async (path) => {
      void chrome.windows.create({
        url: chrome.runtime.getURL(`pages/popup.html#/${path}`),
        type: 'popup',
        width: 550,
        height: 650,
      })
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

  const rpcRelay = createRpcServer<PlayerRelayCommands & PlayerRelayEvents>({
    'relay:command:mount': passThrough(relayFrameClient['relay:command:mount']),
    'relay:command:unmount': passThrough(
      relayFrameClient['relay:command:unmount']
    ),
    'relay:command:start': passThrough(relayFrameClient['relay:command:start']),
    'relay:command:seek': passThrough(relayFrameClient['relay:command:seek']),
    'relay:command:show': passThrough(relayFrameClient['relay:command:show']),
    'relay:command:enterPip': passThrough(
      relayFrameClient['relay:command:enterPip']
    ),
    'relay:event:playerReady': passThrough(
      relayFrameClient['relay:event:playerReady']
    ),
    'relay:event:videoChange': passThrough(
      relayFrameClient['relay:event:videoChange']
    ),
    'relay:event:videoRemoved': passThrough(
      relayFrameClient['relay:event:videoRemoved']
    ),
    'relay:event:preloadNextEpisode': passThrough(
      relayFrameClient['relay:event:preloadNextEpisode']
    ),
    'relay:event:showPopover': passThrough(
      relayFrameClient['relay:event:showPopover']
    ),
  })

  rpcServer.listen()
  rpcRelay.listen()

  // also listen to external messages
  rpcServer.listen(chrome.runtime.onMessageExternal)
}
