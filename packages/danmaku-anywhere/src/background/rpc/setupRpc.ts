import {
  extractMedia,
  setRequestHeaderRule,
} from '@danmaku-anywhere/web-scraper'
import { match } from 'ts-pattern'
import { injectVideoScript } from '@/background/scripting/setupScripting'
import type { BilibiliService } from '@/background/services/BilibiliService'
import type { GenAIService } from '@/background/services/GenAIService'
import type { KazumiService } from '@/background/services/KazumiService'
import type { SeasonService } from '@/background/services/SeasonService'
import type { TencentService } from '@/background/services/TencentService'
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
  PlayerCommands,
  PlayerEvents,
} from '@/common/rpcClient/background/types'
import { relayFrameClient } from '@/common/rpcClient/tab/client'
import type { DanmakuService } from '../services/DanmakuService'
import type { IconService } from '../services/IconService'
import type { ProviderService } from '../services/ProviderService'

// cleanup keyed by tab id
const portCleanupCallbacks = new Map<number, () => void>()

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'media-extraction') return

  port.onMessage.addListener(async (message) => {
    if (message.action === 'extractMedia' && port.sender?.tab?.id) {
      const tabId = port.sender.tab.id
      const { url } = message.data

      try {
        const cleanup = await extractMedia(url, {
          onMediaFound: (mediaInfo) => {
            port.postMessage({
              action: 'extractMedia',
              success: true,
              data: mediaInfo,
              isLast: false,
            })
          },
          onError: (error) => {
            port.postMessage({
              action: 'extractMedia',
              success: false,
              err: error.message,
              isLast: true,
            })
          },
          onComplete: () => {
            port.disconnect()
          },
        })

        // abort after 30 seconds
        setTimeout(() => {
          cleanup()
        }, 30000)

        portCleanupCallbacks.set(tabId, cleanup)
      } catch (err) {
        port.postMessage({
          action: 'extractMedia',
          success: false,
          err: err instanceof Error ? err.message : 'Unknown error',
          isLast: true,
        })
        port.disconnect()
      }
    }
  })

  port.onDisconnect.addListener((port) => {
    if (port.sender?.tab?.id) {
      const tabId = port.sender.tab.id
      const cleanup = portCleanupCallbacks.get(tabId)
      if (cleanup) {
        cleanup()
        portCleanupCallbacks.delete(tabId)
      }
    }
  })
})

export const setupRpc = (
  providerService: ProviderService,
  iconService: IconService,
  danmakuService: DanmakuService,
  seasonService: SeasonService,
  aiService: GenAIService,
  bilibiliService: BilibiliService,
  tencentService: TencentService,
  kazumiService: KazumiService
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

      return activeTab.url ?? null
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
    kazumiSearchContent: async ({ keyword, policy }) => {
      return kazumiService.searchContent(keyword, policy)
    },
    kazumiGetChapters: async ({ url, policy }) => {
      return kazumiService.getChapters(url, policy)
    },
    setHeaders: async (rule) => {
      await setRequestHeaderRule(rule)
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
