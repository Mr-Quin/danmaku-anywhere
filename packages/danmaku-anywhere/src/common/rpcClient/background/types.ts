import type {
  Bookmark,
  CommentEntity,
  CustomEpisode,
  CustomEpisodeLite,
  CustomSeason,
  Episode,
  EpisodeLite,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import type {
  KazumiChapterPayload,
  KazumiChapterResult,
  KazumiSearchPayload,
  KazumiSearchResult,
  SetHeaderRule,
} from '@danmaku-anywhere/web-scraper'
import type { ConfigSchema } from '@mr-quin/dango'
import type {
  GenericVodSearchData,
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonGetAllRequest,
  SeasonQueryFilter,
  SeasonSearchRequest,
} from '@/common/anime/dto'
import type {
  AuthActionResult,
  AuthSessionState,
  AuthSignInInput,
  AuthSignOutResult,
  AuthSignUpInput,
} from '@/common/auth/types'
import type {
  BackupData,
  BackupRestoreResult,
  CloudBackupItem,
} from '@/common/backup/dto'
import type {
  BookmarkAddInput,
  BookmarkDeleteBySeasonInput,
  BookmarkDeleteInput,
  BookmarkRefreshInput,
} from '@/common/bookmark/dto'
import type { BaseUrlConfig } from '@/common/configs/types'
import type {
  CustomEpisodeQueryFilter,
  DanmakuFetchDto,
  DanmakuImportData,
  DanmakuImportResult,
  EpisodeFetchBySeasonParams,
  EpisodeQueryFilter,
  MacCMSFetchData,
} from '@/common/danmaku/dto'
import type { LogEntry } from '@/common/Logger'
import type { ModelManagementState } from '@/common/models/dto'
import type { ModelEntry } from '@/common/models/schema'
import type { AiProviderConfigInput } from '@/common/options/aiProviderConfig/schema'
import type { OcclusionModel } from '@/common/options/danmakuOptions/constant'
import type {
  MountConfig,
  MountConfigAiConfig,
} from '@/common/options/mountConfig/schema'
import type { SeasonMapSnapshot } from '@/common/seasonMap/SeasonMap'
import type { TelemetryRelayEvent } from '@/common/telemetry/events'
import type { OcclusionStatus } from '@/content/player/occlusion/Occlusion.types'
import type { RPCDef } from '../../rpc/types'

type IconSetDto =
  | {
      state: 'active'
      count: number
    }
  | {
      state: 'inactive'
    }
  | {
      state: 'available'
    }
  | {
      state: 'unavailable'
    }

export type TestAiProviderResponse =
  | {
      state: 'success'
    }
  | {
      state: 'invalid'
      message: string
    }
  | {
      state: 'error'
      message: string
    }

export interface ProviderCookieSet {
  url: string
  title?: string
}

export interface ProviderLoginStatus {
  hasLoginProbe: boolean
  cookieSet?: ProviderCookieSet
  ok: boolean
}

export interface ProviderManifestSpec {
  name: string
  hasLoginProbe: boolean
  cookieSet?: ProviderCookieSet
  configSchema?: ConfigSchema
}

export interface ProviderManifestInfo {
  id: string
  name: string
  version: string
  configSchema?: ConfigSchema
  kind: 'preinstalled' | 'user'
}

export interface ProviderManifestList {
  manifests: ProviderManifestInfo[]
  lastCheckedAt: number | null
}

export interface ManifestUpdate {
  manifestId: string
  fromVersion: string
  toVersion: string
}

export interface ManifestValidationIssue {
  path: string
  message: string
}

export type ManifestValidationResult =
  | { valid: true }
  | { valid: false; issues: ManifestValidationIssue[] }

export interface ManifestTestSearchRow {
  providerIds: Record<string, unknown>
  indexedId: string
  title: string
  type?: string
  imageUrl?: string
  episodeCount?: number
}

export interface ManifestTestEpisodeRow {
  providerIds: Record<string, unknown>
  indexedId: string
  title: string
  episodeNumber?: number | string
  params?: Record<string, unknown>
}

export interface ManifestSource {
  manifest: unknown
  kind: 'preinstalled' | 'user'
}

export interface ManifestTestSearchInput {
  manifest: unknown
  keyword: string
  configValues?: Record<string, unknown>
}

export interface ManifestTestEpisodesInput {
  manifest: unknown
  configValues?: Record<string, unknown>
  providerIds: Record<string, unknown>
}

export interface ManifestTestDanmakuInput {
  manifest: unknown
  configValues?: Record<string, unknown>
  providerIds: Record<string, unknown>
  params?: Record<string, unknown>
}

export type BackgroundMethods = {
  iconSet: RPCDef<IconSetDto, void>
  authGetSession: RPCDef<void, AuthSessionState | null>
  authSignUp: RPCDef<AuthSignUpInput, AuthActionResult>
  authSignIn: RPCDef<AuthSignInInput, AuthActionResult>
  authSignOut: RPCDef<void, AuthSignOutResult>
  authDeleteAccount: RPCDef<void, AuthSignOutResult>
  mediaParseUrl: RPCDef<{ url: string }, WithSeason<EpisodeMeta>>
  seasonSearch: RPCDef<
    SeasonSearchRequest,
    (Season | SeasonInsert | CustomSeason)[]
  >
  seasonUpsert: RPCDef<SeasonInsert, Season>
  seasonFilter: RPCDef<SeasonQueryFilter, Season[]>
  seasonGetAll: RPCDef<SeasonGetAllRequest, Season[]>
  seasonDelete: RPCDef<SeasonQueryFilter, void>
  seasonRefresh: RPCDef<SeasonQueryFilter, void>
  episodeFetchBySeason: RPCDef<
    EpisodeFetchBySeasonParams,
    WithSeason<EpisodeMeta>[]
  >
  episodeMatch: RPCDef<MatchEpisodeInput, MatchEpisodeResult>
  episodeFilterLite: RPCDef<EpisodeQueryFilter, WithSeason<EpisodeLite>[]>
  episodeFilter: RPCDef<EpisodeQueryFilter, WithSeason<Episode>[]>
  episodeFetch: RPCDef<DanmakuFetchDto, WithSeason<Episode>>
  episodePreloadNext: RPCDef<WithSeason<EpisodeMeta>, void>
  episodeDelete: RPCDef<EpisodeQueryFilter, void>
  episodeFilterCustom: RPCDef<CustomEpisodeQueryFilter, CustomEpisode[]>
  episodeFilterCustomLite: RPCDef<CustomEpisodeQueryFilter, CustomEpisodeLite[]>
  episodeDeleteCustom: RPCDef<CustomEpisodeQueryFilter, void>
  episodeImport: RPCDef<DanmakuImportData[], DanmakuImportResult>
  seasonMapAdd: RPCDef<SeasonMapSnapshot, void>
  seasonMapPut: RPCDef<SeasonMapSnapshot, void>
  seasonMapDelete: RPCDef<{ key: string }, void>
  seasonMapDeleteMany: RPCDef<{ keys: string[] }, void>

  seasonMapGetAll: RPCDef<void, SeasonMapSnapshot[]>
  danmakuPurgeCache: RPCDef<number, number>
  bilibiliSetCookies: RPCDef<void, void>
  providerProbeLogin: RPCDef<{ manifestId: string }, ProviderLoginStatus>
  providerGetManifestSpec: RPCDef<
    { manifestId: string; locale?: string },
    ProviderManifestSpec
  >
  providerListManifests: RPCDef<{ locale?: string }, ProviderManifestList>
  providerRefreshCatalog: RPCDef<{ locale?: string }, ProviderManifestList>
  providerGetPendingUpdates: RPCDef<void, ManifestUpdate[]>
  providerApplyUpdates: RPCDef<{ manifestIds: string[] }, void>
  providerValidateManifest: RPCDef<
    { manifest: unknown },
    ManifestValidationResult
  >
  providerTestRunSearch: RPCDef<
    ManifestTestSearchInput,
    ManifestTestSearchRow[]
  >
  providerTestRunEpisodes: RPCDef<
    ManifestTestEpisodesInput,
    ManifestTestEpisodeRow[]
  >
  providerTestRunDanmaku: RPCDef<
    ManifestTestDanmakuInput,
    { commentCount: number }
  >
  providerSaveUserManifest: RPCDef<
    { manifest: unknown; mode: 'create' | 'update'; expectedId?: string },
    void
  >
  providerGetManifestSource: RPCDef<
    { manifestId: string },
    ManifestSource | null
  >
  providerDeleteUserManifest: RPCDef<{ manifestId: string }, void>
  fetchImage: RPCDef<{ src: string }, string | null>
  getActiveTabUrl: RPCDef<void, string | null>
  getFrameId: RPCDef<void, number>
  getExtensionManifest: RPCDef<void, chrome.runtime.ManifestV3>
  getAlarm: RPCDef<string, chrome.alarms.Alarm | null>
  remoteLog: RPCDef<LogEntry, void>
  telemetryEvent: RPCDef<TelemetryRelayEvent, void>
  exportDebugData: RPCDef<void, { id: string }>
  getFontList: RPCDef<void, chrome.fontSettings.FontName[]>
  getPlatformInfo: RPCDef<void, chrome.runtime.PlatformInfo>
  mountConfigCreate: RPCDef<unknown, MountConfig>
  mountConfigGetAll: RPCDef<void, MountConfig[]>
  kazumiSearchContent: RPCDef<KazumiSearchPayload, KazumiSearchResult[]>
  kazumiGetChapters: RPCDef<KazumiChapterPayload, KazumiChapterResult[][]>
  genericVodSearch: RPCDef<GenericVodSearchData, CustomSeason[]>
  genericFetchDanmakuForUrl: RPCDef<MacCMSFetchData, CustomEpisode>
  setHeaders: RPCDef<SetHeaderRule, void>
  extractTitle: RPCDef<
    {
      text: string
      options: MountConfigAiConfig
    },
    ExtractTitleResponse['result']
  >
  openPopupInNewWindow: RPCDef<
    { path: string; width?: number; height?: number },
    void
  >
  openPopupInNewTab: RPCDef<{ path: string }, void>
  getConfigMacCms: RPCDef<{ force?: boolean } | void, BaseUrlConfig>
  getConfigDanmuIcu: RPCDef<{ force?: boolean } | void, BaseUrlConfig>
  providerConfigDelete: RPCDef<string, void>
  testAiProvider: RPCDef<AiProviderConfigInput, TestAiProviderResponse>
  backupExport: RPCDef<void, BackupData>
  backupImport: RPCDef<unknown, BackupRestoreResult>
  cloudBackupList: RPCDef<void, CloudBackupItem[]>
  cloudBackupCreate: RPCDef<void, { success: boolean; id: string }>
  cloudBackupDownload: RPCDef<string, BackupData>
  dataWipeDanmaku: RPCDef<{ includeCustomEpisodes: boolean }, void>
  bookmarkAdd: RPCDef<BookmarkAddInput, Bookmark>
  bookmarkDelete: RPCDef<BookmarkDeleteInput, void>
  bookmarkDeleteBySeason: RPCDef<BookmarkDeleteBySeasonInput, void>
  bookmarkGetAll: RPCDef<void, Bookmark[]>
  bookmarkRefresh: RPCDef<BookmarkRefreshInput, Bookmark>
  occlusionGetModels: RPCDef<void, ModelManagementState>
  occlusionRefreshModels: RPCDef<void, ModelManagementState>
  occlusionResolveModel: RPCDef<{ id: string }, ModelEntry>
  occlusionDownloadModel: RPCDef<{ id: string }, ModelManagementState>
  occlusionDeleteModel: RPCDef<{ id: string }, ModelManagementState>
  occlusionAddCorsRule: RPCDef<{ url: string }, number>
  occlusionRemoveCorsRule: RPCDef<{ ruleId: number }, void>
}

type InputWithFrameId<TInput> = TInput extends void
  ? {
      frameId: number
    }
  : {
      frameId: number
      data: TInput
    }

type FrameContext = {
  frameId: number
}

// Controller -> Player communication
// Here the frameId is used to identify the DESTINATION frame
export type PlayerRelayCommands = {
  'relay:command:mount': RPCDef<
    InputWithFrameId<CommentEntity[]>,
    boolean,
    FrameContext
  >
  'relay:command:unmount': RPCDef<InputWithFrameId<void>, boolean, FrameContext>
  'relay:command:start': RPCDef<InputWithFrameId<string>, void, FrameContext>
  'relay:command:seek': RPCDef<InputWithFrameId<number>, void, FrameContext>
  'relay:command:enterPip': RPCDef<InputWithFrameId<void>, void, FrameContext>
  'relay:command:show': RPCDef<InputWithFrameId<boolean>, void, FrameContext>
  'relay:command:controllerReady': RPCDef<
    InputWithFrameId<void>,
    void,
    FrameContext
  >
  'relay:command:debugSkipButton': RPCDef<
    InputWithFrameId<void>,
    void,
    FrameContext
  >
  'relay:command:getSegmentationStats': RPCDef<
    InputWithFrameId<void>,
    SegmentationStats,
    FrameContext
  >
  'relay:command:setOcclusionDebugOverlay': RPCDef<
    InputWithFrameId<boolean>,
    void,
    FrameContext
  >
}

export type SegmentationStats = {
  running: boolean
  model: OcclusionModel | null
  fps: number | null
  lastError: string | null
  debugOverlay: boolean
}

type PlayerReadyData = {
  url: string
  documentId: string
}

export interface VideoInfo {
  src: string
  width: number
  height: number
  playing: boolean
  muted: boolean
}

// Player -> Controller communication
// Here the frameId is used to identify the SOURCE frame
export type PlayerRelayEvents = {
  'relay:event:playerReady': RPCDef<InputWithFrameId<PlayerReadyData>, void>
  'relay:event:playerUnload': RPCDef<InputWithFrameId<void>, void>
  'relay:event:videoChange': RPCDef<InputWithFrameId<VideoInfo>, void>
  'relay:event:videoRemoved': RPCDef<InputWithFrameId<void>, void>
  'relay:event:videoStateChange': RPCDef<
    InputWithFrameId<Pick<VideoInfo, 'playing' | 'muted'>>,
    void
  >
  'relay:event:preloadNextEpisode': RPCDef<InputWithFrameId<void>, void>
  'relay:event:showPopover': RPCDef<InputWithFrameId<void>, void>
  'relay:event:userInteraction': RPCDef<InputWithFrameId<void>, void>
  'relay:event:occlusionStatus': RPCDef<InputWithFrameId<OcclusionStatus>, void>
}
