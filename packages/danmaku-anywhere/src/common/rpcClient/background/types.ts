import type {
  CommentEntity,
  CustomEpisode,
  CustomEpisodeLite,
  CustomSeason,
  Episode,
  EpisodeLite,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { BilibiliUserInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'
import type {
  KazumiChapterPayload,
  KazumiChapterResult,
  KazumiSearchPayload,
  KazumiSearchResult,
  SetHeaderRule,
} from '@danmaku-anywhere/web-scraper'
import type {
  GenericVodSearchData,
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonQueryFilter,
  SeasonSearchRequest,
} from '@/common/anime/dto'
import type { ImageFetchOptions } from '@/common/components/image/types'
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
import type { AiProviderConfigInput } from '@/common/options/aiProviderConfig/schema'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import type { SeasonMapSnapshot } from '@/common/seasonMap/SeasonMap'
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
      success: true
    }
  | {
      success: false
      message: string
    }

export type BackgroundMethods = {
  iconSet: RPCDef<IconSetDto, void>
  mediaParseUrl: RPCDef<{ url: string }, WithSeason<EpisodeMeta>>
  seasonSearch: RPCDef<SeasonSearchRequest, (Season | CustomSeason)[]>
  seasonFilter: RPCDef<SeasonQueryFilter, Season[]>
  seasonGetAll: RPCDef<void, Season[]>
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
  episodePreloadNext: RPCDef<DanmakuFetchDto, void>
  episodeDelete: RPCDef<EpisodeQueryFilter, void>
  episodeFilterCustom: RPCDef<CustomEpisodeQueryFilter, CustomEpisode[]>
  episodeFilterCustomLite: RPCDef<CustomEpisodeQueryFilter, CustomEpisodeLite[]>
  episodeDeleteCustom: RPCDef<CustomEpisodeQueryFilter, void>
  episodeImport: RPCDef<DanmakuImportData[], DanmakuImportResult>
  seasonMapAdd: RPCDef<SeasonMapSnapshot, void>
  seasonMapGetAll: RPCDef<void, SeasonMapSnapshot[]>
  danmakuPurgeCache: RPCDef<number, number>
  bilibiliSetCookies: RPCDef<void, void>
  bilibiliGetLoginStatus: RPCDef<void, BilibiliUserInfo>
  tencentTestCookies: RPCDef<void, boolean>
  fetchImage: RPCDef<{ src: string; options?: ImageFetchOptions }, string>
  getActiveTabUrl: RPCDef<void, string | null>
  getFrameId: RPCDef<void, number>
  getAllFrames: RPCDef<void, chrome.webNavigation.GetAllFrameResultDetails[]>
  injectScript: RPCDef<number, void>
  remoteLog: RPCDef<LogEntry, void>
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
      options?: {
        providerId?: string
        maxInputLength?: number
        prompt?: string
      }
    },
    ExtractTitleResponse['result']
  >
  openPopupInNewWindow: RPCDef<string, void>
  getConfigMacCms: RPCDef<{ force?: boolean } | void, BaseUrlConfig>
  getConfigDanmuIcu: RPCDef<{ force?: boolean } | void, BaseUrlConfig>
  providerConfigDelete: RPCDef<string, void>
  testAiProvider: RPCDef<AiProviderConfigInput, TestAiProviderResponse>
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
}

// Player -> Controller communication
// Here the frameId is used to identify the SOURCE frame
export type PlayerRelayEvents = {
  'relay:event:playerReady': RPCDef<InputWithFrameId<void>, void>
  'relay:event:videoChange': RPCDef<InputWithFrameId<void>, void>
  'relay:event:videoRemoved': RPCDef<InputWithFrameId<void>, void>
  'relay:event:preloadNextEpisode': RPCDef<InputWithFrameId<void>, void>
  'relay:event:showPopover': RPCDef<InputWithFrameId<void>, void>
}
