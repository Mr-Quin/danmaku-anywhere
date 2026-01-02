import {
  getDanmuicuConfig,
  getMaccmsConfig,
} from '@danmaku-anywhere/danmaku-provider/config'
import { setRequestHeaderRule } from '@danmaku-anywhere/web-scraper'
import { inject, injectable } from 'inversify'
import { match } from 'ts-pattern'
import { ScriptingManager } from '@/background/scripting/ScriptingManager'
import { GenAIService } from '@/background/services/GenAIService'
import { IconService } from '@/background/services/IconService'
import { ImageCacheService } from '@/background/services/ImageCache/ImageCache.service'
import { KazumiService } from '@/background/services/KazumiService'
import { LogService } from '@/background/services/Logging/Log.service'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import { BilibiliService } from '@/background/services/providers/bilibili/BilibiliService'
import { MacCmsProviderService } from '@/background/services/providers/MacCmsProviderService'
import { TencentService } from '@/background/services/providers/tencent/TencentService'
import { invalidateContentScriptData } from '@/background/utils/invalidateContentScriptData'
import type { EpisodeFetchBySeasonParams } from '@/common/danmaku/dto'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
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
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { DebugFileService } from '../services/DebugFile/DebugFile.service'
import { EpisodeMatchingService } from '../services/matching/EpisodeMatchingService'
import { ProviderService } from '../services/providers/ProviderService'

@injectable('Singleton')
export class RpcManager {
  private logger: ILogger

  constructor(
    @inject(ProviderService)
    private providerService: ProviderService,
    @inject(IconService) private iconService: IconService,
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(GenAIService) private aiService: GenAIService,
    @inject(KazumiService) private kazumiService: KazumiService,
    @inject(TitleMappingService)
    private titleMappingService: TitleMappingService,
    @inject(MountConfigService)
    private mountConfigService: MountConfigService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(EpisodeMatchingService)
    private episodeMatchingService: EpisodeMatchingService,
    @inject(LogService) private logService: LogService,
    @inject(ScriptingManager) private scriptingManager: ScriptingManager,
    @inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb,
    @inject(LoggerSymbol) logger: ILogger,
    @inject(DebugFileService) private debugFileService: DebugFileService,
    @inject(ImageCacheService) private imageCacheService: ImageCacheService
  ) {
    this.logger = logger.sub('[RpcManager]')
  }

  setup() {
    const rpcServer = createRpcServer<BackgroundMethods>(
      {
        seasonSearch: async (input) => {
          return this.providerService.searchSeason(input)
        },
        mediaParseUrl: async (input) => {
          return this.providerService.parseUrl(input.url)
        },
        episodeFetchBySeason: async (input: EpisodeFetchBySeasonParams) => {
          return this.providerService.fetchEpisodesBySeason(input.seasonId)
        },
        episodeMatch: async (data) => {
          return this.episodeMatchingService.findMatchingEpisodes(data)
        },
        bilibiliSetCookies: async () => {
          return BilibiliService.setCookies(this.logger)
        },
        bilibiliGetLoginStatus: async () => {
          return BilibiliService.getLoginStatus(this.logger)
        },
        tencentTestCookies: async () => {
          return TencentService.testCookies(this.logger)
        },
        iconSet: async (data, sender) => {
          if (sender.tab?.id === undefined) {
            throw new RpcException('No tab id found')
          }

          const tabId = sender.tab.id

          match(data)
            .with({ state: 'active' }, (data) => {
              void this.iconService.setActive(tabId, data.count)
            })
            .with({ state: 'inactive' }, () => {
              void this.iconService.setNormal(tabId)
            })
            .with({ state: 'available' }, () => {
              void this.iconService.setNormal(tabId)
            })
            .with({ state: 'unavailable' }, () => {
              void this.iconService.setUnavailable(tabId)
            })
            .exhaustive()

          this.logger.debug('Icon state set to:', data.state)
        },
        episodeFilter: async (filter) => {
          const result = await this.danmakuService.filter(filter)
          return result
        },
        episodeFilterLite: async (filter) => {
          const result = await this.danmakuService.filterLite(filter)
          return result || null
        },
        seasonGetAll: async () => {
          const result = await this.seasonService.getAll()
          return result
        },
        seasonFilter: async (data) => {
          return this.seasonService.filter(data)
        },
        seasonDelete: async (data) => {
          return this.seasonService.delete(data)
        },
        seasonRefresh: async (data) => {
          return this.providerService.refreshSeason(data)
        },
        seasonMapAdd: async (data) => {
          return this.titleMappingService.add(SeasonMap.from(data))
        },
        seasonMapGetAll: async () => {
          const seasonMaps = await this.titleMappingService.getAll()
          return seasonMaps.map((map) => map.toSnapshot())
        },
        episodeFetch: async (data, sender) => {
          const result = await this.providerService.getDanmaku(data)
          void invalidateContentScriptData(sender.tab?.id)
          return result
        },
        episodePreloadNext: async (data, sender) => {
          return await this.providerService.preloadNextEpisode(data)
        },
        episodeImport: async (data, sender) => {
          const result = await this.danmakuService.import(data)
          void invalidateContentScriptData(sender.tab?.id)
          return result
        },
        episodeDelete: async (filter, sender) => {
          const result = await this.danmakuService.delete(filter)
          void invalidateContentScriptData(sender.tab?.id)
          return result
        },
        episodeFilterCustom: async (filter) => {
          return this.danmakuService.filterCustom(filter)
        },
        episodeFilterCustomLite: async (filter) => {
          return this.danmakuService.filterCustomLite(filter)
        },
        episodeDeleteCustom: async (filter, sender) => {
          const result = await this.danmakuService.deleteCustom(filter)
          void invalidateContentScriptData(sender.tab?.id)
          return result
        },
        danmakuPurgeCache: async (days, sender) => {
          const result = await this.danmakuService.purgeOlderThan(days)
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
        getFrameById: async (frameId, sender) => {
          if (sender.tab?.id === undefined) {
            throw new RpcException('No tab id found')
          }

          const tabId = sender.tab.id

          const frame = await chrome.webNavigation.getFrame({ frameId, tabId })

          if (!frame) {
            throw new RpcException('No frames found')
          }

          return frame
        },
        getFrameId: async (_, sender) => {
          if (sender.frameId === undefined) {
            throw new RpcException('Sender does not have frame id')
          }

          return sender.frameId
        },
        injectScript: async (frameId, sender) => {
          this.logger.debug('Injecting script into frame', { frameId })

          if (sender.tab?.id === undefined) {
            throw new RpcException('No tab id found')
          }

          const tabId = sender.tab.id

          await this.scriptingManager.injectVideoScript(tabId, frameId)
        },
        remoteLog: async (data) => {
          void this.logService.log(data)
        },
        exportDebugData: async () => {
          return this.debugFileService.upload()
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
          return this.mountConfigService.getAll()
        },
        mountConfigCreate: async (data) => {
          return this.mountConfigService.create(data)
        },
        extractTitle: async (input) => {
          return this.aiService.extractTitle(input)
        },
        getFontList: async () => {
          return chrome.fontSettings.getFontList()
        },
        getPlatformInfo: async () => {
          return chrome.runtime.getPlatformInfo()
        },
        fetchImage: async ({ src }) => {
          return this.imageCacheService.get(src)
        },
        kazumiSearchContent: async ({ keyword, policy }) => {
          return this.kazumiService.searchContent(keyword, policy)
        },
        kazumiGetChapters: async ({ url, policy }) => {
          return this.kazumiService.getChapters(url, policy)
        },
        genericVodSearch: async ({ baseUrl, keyword }) => {
          return MacCmsProviderService.search(baseUrl, keyword, this.logger)
        },
        genericFetchDanmakuForUrl: async ({ title, url, providerConfigId }) => {
          return MacCmsProviderService.fetchDanmakuForUrl(
            title,
            url,
            providerConfigId,
            this.danmakuService,
            this.providerConfigService
          )
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
        getConfigMacCms: async (input) => {
          return getMaccmsConfig(input?.force)
        },
        getConfigDanmuIcu: async (input) => {
          return getDanmuicuConfig(input?.force)
        },
        providerConfigDelete: async (id, sender) => {
          await this.db.transaction(
            'rw',
            this.db.season,
            this.db.episode,
            async () => {
              const seasons = await this.db.season
                .where({ providerConfigId: id })
                .toArray()
              const seasonIds = seasons.map((s) => s.id)

              if (seasonIds.length > 0) {
                await this.db.episode
                  .where('seasonId')
                  .anyOf(seasonIds)
                  .delete()
              }

              await this.db.season.where({ providerConfigId: id }).delete()
            }
          )

          await this.providerConfigService.deleteFromStorage(id)

          void invalidateContentScriptData(sender.tab?.id)
        },
      },
      {
        logger: this.logger,
      }
    )

    const passThrough = <TRPCDef extends AnyRPCDef>(
      clientMethod: TabRPCClientMethod<TRPCDef>
    ): RRPServerHandler<TRPCDef> => {
      return async (data, sender, setContext) => {
        // Apparently tab.index can be -1 in some cases, this will cause an error so we need to handle it
        const tabIndex =
          sender.tab?.index === -1 ? undefined : sender.tab?.index

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

    const rpcRelay = createRpcServer<PlayerRelayCommands & PlayerRelayEvents>(
      {
        'relay:command:mount': passThrough(
          relayFrameClient['relay:command:mount']
        ),
        'relay:command:unmount': passThrough(
          relayFrameClient['relay:command:unmount']
        ),
        'relay:command:start': passThrough(
          relayFrameClient['relay:command:start']
        ),
        'relay:command:seek': passThrough(
          relayFrameClient['relay:command:seek']
        ),
        'relay:command:show': passThrough(
          relayFrameClient['relay:command:show']
        ),
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
      },
      {
        logger: this.logger,
      }
    )

    rpcServer.listen()
    rpcRelay.listen()

    // also listen to external messages
    rpcServer.listen(chrome.runtime.onMessageExternal)
  }
}
