import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type { BilibiliUserInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { ExtractTitleResponse } from '@danmaku-anywhere/danmaku-provider/genAi'

import type { RPCDef } from '../../rpc/types'

import type {
  BilibiliEpisode,
  BilibiliMediaSearchResult,
  DanDanPlayEpisode,
  DanDanPlayMediaSearchResult,
  MatchEpisodeInput,
  MatchEpisodeResult,
  MediaSearchParams,
  TencentEpisode,
  TencentMediaSearchResult,
} from '@/common/anime/dto'
import type {
  CustomDanmakuCreateData,
  DanmakuDeleteDto,
  DanmakuFetchDto,
  DanmakuGetBySeasonDto,
  DanmakuGetManyDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/dto'
import type {
  Danmaku,
  DanmakuInsert,
  DanmakuLite,
} from '@/common/danmaku/models/danmaku'
import type { DanmakuMetaExternal } from '@/common/danmaku/models/meta'
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

type AnimeMethods = {
  mediaParseUrl: RPCDef<{ url: string }, DanmakuMetaExternal>
  searchDanDanPlay: RPCDef<MediaSearchParams, DanDanPlayMediaSearchResult>
  searchBilibili: RPCDef<MediaSearchParams, BilibiliMediaSearchResult>
  searchTencent: RPCDef<MediaSearchParams, TencentMediaSearchResult>
  episodesGetDanDanPlay: RPCDef<number, DanDanPlayEpisode[]>
  episodesGetBilibili: RPCDef<number, BilibiliEpisode[]>
  episodesGetTencent: RPCDef<string, TencentEpisode[]>
  episodeMatch: RPCDef<MatchEpisodeInput, MatchEpisodeResult>
  bilibiliSetCookies: RPCDef<void, void>
  bilibiliGetLoginStatus: RPCDef<void, BilibiliUserInfo>
  tencentTestCookies: RPCDef<void, boolean>
}

type DanmakuMethods = {
  danmakuGetAll: RPCDef<void, Danmaku[]>
  danmakuGetAllLite: RPCDef<void, DanmakuLite[]>
  danmakuGetOne: RPCDef<DanmakuGetOneDto, Danmaku | null>
  danmakuGetOneLite: RPCDef<DanmakuGetOneDto, DanmakuLite | null>
  danmakuGetMany: RPCDef<DanmakuGetManyDto, Danmaku[]>
  danmakuGetByAnime: RPCDef<DanmakuGetBySeasonDto, Danmaku[]>
  danmakuFetch: RPCDef<DanmakuFetchDto, Danmaku>
  danmakuCreateCustom: RPCDef<CustomDanmakuCreateData[], void>
  danmakuImport: RPCDef<DanmakuInsert[], void>
  danmakuDelete: RPCDef<DanmakuDeleteDto, void>
  danmakuDeleteAll: RPCDef<void, void>
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
  AnimeMethods &
  DanmakuMethods &
  AIMethods &
  ControlMethods &
  MountConfigMethods
