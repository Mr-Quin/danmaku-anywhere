import type {
  BilibiliOf,
  CommentEntity,
  CustomEpisode,
  DanDanPlayOf,
  TencentOf,
} from '@danmaku-anywhere/danmaku-converter'
import type { BilibiliUserInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'

import type { RPCDef } from '../../rpc/types'

import type {
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonQueryFilter,
  SeasonSearchParams,
} from '@/common/anime/dto'

import type { Season } from '@danmaku-anywhere/danmaku-converter'

import type {
  CustomEpisodeQueryFilter,
  DanmakuFetchDto,
  DanmakuImportData,
  DanmakuImportResult,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import type {
  Episode,
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

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
  seasonSearchDanDanPlay: RPCDef<SeasonSearchParams, DanDanPlayOf<Season>[]>
  seasonSearchBilibili: RPCDef<SeasonSearchParams, BilibiliOf<Season>[]>
  seasonSearchTencent: RPCDef<SeasonSearchParams, TencentOf<Season>[]>
  seasonFilter: RPCDef<SeasonQueryFilter, Season[]>
  seasonGetAll: RPCDef<void, Season[]>
  episodeSearchDanDanPlay: RPCDef<
    number,
    WithSeason<DanDanPlayOf<EpisodeMeta>>[]
  >
  episodeSearchBilibili: RPCDef<number, WithSeason<BilibiliOf<EpisodeMeta>>[]>
  episodeSearchTencent: RPCDef<number, WithSeason<TencentOf<EpisodeMeta>>[]>
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
  episodeDeleteCustom: RPCDef<CustomEpisodeQueryFilter, void>
  episodeImport: RPCDef<DanmakuImportData[], DanmakuImportResult>
  danmakuPurgeCache: RPCDef<number, number>
}

type ControlMethods = {
  getActiveTabUrl: RPCDef<void, string>
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
export type PlayerCommands = {
  mount: RPCDef<InputWithFrameId<CommentEntity[]>, boolean, FrameContext>
  unmount: RPCDef<InputWithFrameId<void>, boolean, FrameContext>
  start: RPCDef<InputWithFrameId<string>, void, FrameContext>
  seek: RPCDef<InputWithFrameId<number>, void, FrameContext>
  enterPiP: RPCDef<InputWithFrameId<void>, void, FrameContext>
  show: RPCDef<InputWithFrameId<boolean>, void, FrameContext>
}

// Player -> Controller communication
// Here the frameId is used to identify the SOURCE frame
export type PlayerEvents = {
  ready: RPCDef<InputWithFrameId<void>, void>
  videoChange: RPCDef<InputWithFrameId<void>, void>
  videoRemoved: RPCDef<InputWithFrameId<void>, void>
}

export type BackgroundMethods = IconMethods &
  SeasonMethods &
  EpisodeMethods &
  AIMethods &
  ControlMethods &
  MountConfigMethods
