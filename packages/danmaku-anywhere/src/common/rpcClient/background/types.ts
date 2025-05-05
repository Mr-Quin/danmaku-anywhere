import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type { BilibiliUserInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'

import type { RPCDef } from '../../rpc/types'

import type {
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonQueryFilter,
  SeasonSearchParams,
} from '@/common/anime/dto'
import {
  BilibiliSeasonV1,
  DanDanPlaySeasonV1,
  SeasonV1,
  TencentSeasonV1,
} from '@/common/anime/types/v1/schema'
import type { DanmakuFetchDto, EpisodeQueryFilter } from '@/common/danmaku/dto'
import {
  BiliBiliMeta,
  CustomEpisodeInsertV4,
  CustomEpisodeV4,
  DanDanPlayMeta,
  EpisodeInsertV4,
  EpisodeLiteV4,
  EpisodeMeta,
  EpisodeV4,
  TencentMeta,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'
import type { MountConfig } from '@/common/options/mountConfig/schema'

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
  seasonSearchDanDanPlay: RPCDef<SeasonSearchParams, DanDanPlaySeasonV1[]>
  seasonSearchBilibili: RPCDef<SeasonSearchParams, BilibiliSeasonV1[]>
  seasonSearchTencent: RPCDef<SeasonSearchParams, TencentSeasonV1[]>
  seasonFilter: RPCDef<SeasonQueryFilter, SeasonV1[]>
  seasonGetAll: RPCDef<void, SeasonV1[]>
  episodeSearchDanDanPlay: RPCDef<number, WithSeason<DanDanPlayMeta>[]>
  episodeSearchBilibili: RPCDef<number, WithSeason<BiliBiliMeta>[]>
  episodeSearchTencent: RPCDef<number, WithSeason<TencentMeta>[]>
  episodeMatch: RPCDef<MatchEpisodeInput, MatchEpisodeResult>
  bilibiliSetCookies: RPCDef<void, void>
  bilibiliGetLoginStatus: RPCDef<void, BilibiliUserInfo>
  tencentTestCookies: RPCDef<void, boolean>
  fetchImage: RPCDef<string, string>
}

type EpisodeMethods = {
  episodeGetAll: RPCDef<void, WithSeason<EpisodeV4>[]>
  episodeGetAllLite: RPCDef<void, WithSeason<EpisodeLiteV4>[]>
  episodeGetOne: RPCDef<EpisodeQueryFilter, WithSeason<EpisodeV4> | null>
  episodeGetOneLite: RPCDef<
    EpisodeQueryFilter,
    WithSeason<EpisodeLiteV4> | null
  >
  episodeGetMany: RPCDef<number[], WithSeason<EpisodeV4>[]>
  episodeFilter: RPCDef<EpisodeQueryFilter, WithSeason<EpisodeV4>[]>
  episodeFetch: RPCDef<DanmakuFetchDto, WithSeason<EpisodeV4>>
  episodeDelete: RPCDef<EpisodeQueryFilter, number>
  episodeDeleteAll: RPCDef<void, void>
  danmakuCreateCustom: RPCDef<CustomEpisodeInsertV4[], CustomEpisodeV4[]>
  danmakuImport: RPCDef<EpisodeInsertV4[], void>
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
