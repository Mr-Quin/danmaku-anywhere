import type { MatchEpisodeResult } from '@/common/anime/dto'
import type { BackupData, BackupRestoreResult } from '@/common/backup/dto'
import type { BaseUrlConfig } from '@/common/configs/types'
import type {
  BackgroundMethods,
  PlayerRelayCommands,
  PlayerRelayEvents,
} from '@/common/rpcClient/background/types'
import type { ControllerMethods } from '@/common/rpcClient/controller/types'
import type { StandaloneRpcHandlers } from './createStandaloneRpcClient'

const standaloneBaseUrlConfig: BaseUrlConfig = {
  baseUrls: ['https://example.com'],
}

const standaloneBackupData: BackupData = {
  meta: {
    version: 1,
    timestamp: Date.now(),
  },
  services: {},
}

const standaloneBackupRestoreResult: BackupRestoreResult = {
  success: true,
  details: {},
}

const standaloneMatchEpisodeResult: MatchEpisodeResult = {
  status: 'notFound',
  data: null,
  cause: 'Standalone mode',
}

export const standaloneBackgroundHandlers: StandaloneRpcHandlers<BackgroundMethods> =
  {
    iconSet: () => ({ state: 'available' }),
    seasonSearch: () => [],
    seasonFilter: () => [],
    seasonGetAll: () => [],
    seasonMapGetAll: () => [],
    seasonMapAdd: () => undefined,
    seasonMapDelete: () => undefined,
    seasonDelete: () => undefined,
    seasonRefresh: () => undefined,
    episodeFetchBySeason: () => [],
    episodeFilterLite: () => [],
    episodeFilter: () => [],
    episodeFilterCustom: () => [],
    episodeFilterCustomLite: () => [],
    episodeDelete: () => undefined,
    episodeDeleteCustom: () => undefined,
    episodePreloadNext: () => undefined,
    episodeMatch: () => standaloneMatchEpisodeResult,
    episodeFetch: () =>
      null as unknown as BackgroundMethods['episodeFetch']['output'],
    episodeImport: () => ({
      success: [],
      error: [],
    }),
    mediaParseUrl: () =>
      null as unknown as BackgroundMethods['mediaParseUrl']['output'],
    danmakuPurgeCache: () => 0,
    bilibiliGetLoginStatus: () => ({ isLogin: true }),
    tencentTestCookies: () => true,
    fetchImage: ({ src }) => src,
    getActiveTabUrl: () => 'https://example.com',
    getFrameId: () => 0,
    getAllFrames: () => [],
    getExtensionVersion: () => import.meta.env.VERSION ?? 'standalone',
    getAlarm: () => null,
    injectScript: () => undefined,
    remoteLog: () => undefined,
    exportDebugData: () => ({ id: 'standalone' }),
    getFontList: () => [],
    getPlatformInfo: () => ({
      os: 'linux',
      arch: 'x86-64',
      nacl_arch: 'x86-64',
    }),
    mountConfigCreate: () =>
      null as unknown as BackgroundMethods['mountConfigCreate']['output'],
    mountConfigGetAll: () => [],
    kazumiSearchContent: () => [],
    kazumiGetChapters: () => [],
    genericVodSearch: () => [],
    genericFetchDanmakuForUrl: () =>
      null as unknown as BackgroundMethods['genericFetchDanmakuForUrl']['output'],
    setHeaders: () => undefined,
    extractTitle: () => 'Standalone title',
    openPopupInNewWindow: () => undefined,
    getConfigMacCms: () => standaloneBaseUrlConfig,
    getConfigDanmuIcu: () => standaloneBaseUrlConfig,
    providerConfigDelete: () => undefined,
    testAiProvider: () => ({ state: 'success' }),
    backupExport: () => standaloneBackupData,
    backupImport: () => standaloneBackupRestoreResult,
    dataWipeDanmaku: () => undefined,
    bilibiliSetCookies: () => undefined,
  }

export const standaloneControllerHandlers: StandaloneRpcHandlers<ControllerMethods> =
  {
    ping: () => true,
    danmakuMount: () => undefined,
    danmakuUnmount: () => undefined,
    danmakuGetState: () => ({
      isMounted: false,
      manual: false,
    }),
    invalidateCache: () => undefined,
  }

export const standalonePlayerCommandHandlers: StandaloneRpcHandlers<PlayerRelayCommands> =
  {
    'relay:command:mount': () => true,
    'relay:command:unmount': () => true,
    'relay:command:start': () => undefined,
    'relay:command:seek': () => undefined,
    'relay:command:enterPip': () => undefined,
    'relay:command:show': () => undefined,
  }

export const standalonePlayerEventHandlers: StandaloneRpcHandlers<PlayerRelayEvents> =
  {
    'relay:event:playerReady': () => undefined,
    'relay:event:videoChange': () => undefined,
    'relay:event:videoRemoved': () => undefined,
    'relay:event:preloadNextEpisode': () => undefined,
    'relay:event:showPopover': () => undefined,
  }
