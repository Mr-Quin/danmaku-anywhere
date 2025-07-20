import type {
  CommentEntity,
  CustomEpisode,
  CustomEpisodeLite,
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
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonQueryFilter,
  SeasonSearchParams,
} from '@/common/anime/dto'
import type {
  CustomEpisodeQueryFilter,
  DanmakuFetchDto,
  DanmakuImportData,
  DanmakuImportResult,
  EpisodeQueryFilter,
  EpisodeSearchParams,
} from '@/common/danmaku/dto'
import type { MountConfig } from '@/common/options/mountConfig/schema'
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

type IconMethods = {
  iconSet: RPCDef<IconSetDto, void>
}

type SeasonMethods = {
  mediaParseUrl: RPCDef<{ url: string }, WithSeason<EpisodeMeta>>
  seasonSearch: RPCDef<SeasonSearchParams, Season[]>
  seasonFilter: RPCDef<SeasonQueryFilter, Season[]>
  seasonGetAll: RPCDef<void, Season[]>
  seasonDelete: RPCDef<SeasonQueryFilter, void>
  seasonRefresh: RPCDef<SeasonQueryFilter, void>
  episodeSearch: RPCDef<EpisodeSearchParams, WithSeason<EpisodeMeta>[]>
  episodeMatch: RPCDef<MatchEpisodeInput, MatchEpisodeResult>
  bilibiliSetCookies: RPCDef<void, void>
  bilibiliGetLoginStatus: RPCDef<void, BilibiliUserInfo>
  tencentTestCookies: RPCDef<void, boolean>
  fetchImage: RPCDef<string, string>
}

type EpisodeMethods = {
  episodeFilterLite: RPCDef<EpisodeQueryFilter, WithSeason<EpisodeLite>[]>
  episodeFilter: RPCDef<EpisodeQueryFilter, WithSeason<Episode>[]>
  episodeFetch: RPCDef<DanmakuFetchDto, WithSeason<Episode>>
  episodeDelete: RPCDef<EpisodeQueryFilter, void>
  episodeFilterCustom: RPCDef<CustomEpisodeQueryFilter, CustomEpisode[]>
  episodeFilterCustomLite: RPCDef<CustomEpisodeQueryFilter, CustomEpisodeLite[]>
  episodeDeleteCustom: RPCDef<CustomEpisodeQueryFilter, void>
  episodeImport: RPCDef<DanmakuImportData[], DanmakuImportResult>
  danmakuPurgeCache: RPCDef<number, number>
}

type ControlMethods = {
  getActiveTabUrl: RPCDef<void, string | null>
  getFrameId: RPCDef<void, number>
  getAllFrames: RPCDef<void, chrome.webNavigation.GetAllFrameResultDetails[]>
  injectScript: RPCDef<number, void>
  remoteLog: RPCDef<any, void>
  getFontList: RPCDef<void, chrome.fontSettings.FontName[]>
  getPlatformInfo: RPCDef<void, chrome.runtime.PlatformInfo>
}

type MountConfigMethods = {
  mountConfigCreate: RPCDef<unknown, MountConfig>
  mountConfigGetAll: RPCDef<void, MountConfig[]>
}

type KazumiMethods = {
  kazumiSearchContent: RPCDef<KazumiSearchPayload, KazumiSearchResult[]>
  kazumiGetChapters: RPCDef<KazumiChapterPayload, KazumiChapterResult[][]>
  setHeaders: RPCDef<SetHeaderRule, void>
}

type AIMethods = {
  extractTitle: RPCDef<string, ExtractTitleResponse['result']>
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
}

export type BackgroundMethods = IconMethods &
  SeasonMethods &
  EpisodeMethods &
  AIMethods &
  ControlMethods &
  MountConfigMethods &
  KazumiMethods
