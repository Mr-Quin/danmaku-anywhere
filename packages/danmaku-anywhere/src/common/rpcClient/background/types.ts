import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type { BilibiliUserInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'

import type { RPCDef } from '../../rpc/types'

import type {
  BilibiliEpisode,
  BilibiliMediaSearchResult,
  DanDanPlayMediaSearchResult,
  MatchEpisodeInput,
  MatchEpisodeResult,
  MediaSearchParams,
  TencentEpisode,
  TencentMediaSearchResult,
} from '@/common/anime/dto'
import type {
  DanmakuDeleteDto,
  DanmakuGetBySeasonDto,
  DanmakuFetchDto,
  DanmakuGetManyDto,
  DanmakuGetOneDto,
  CustomDanmakuCreateData,
} from '@/common/danmaku/dto'
import type {
  Danmaku,
  DanmakuInsert,
  DanmakuLite,
} from '@/common/danmaku/models/danmaku'
import type { DanmakuMetaExternal } from '@/common/danmaku/models/meta'

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

/* eslint-disable @typescript-eslint/consistent-type-definitions */
type IconMethods = {
  iconSet: RPCDef<IconSetDto, void>
}

type AnimeMethods = {
  mediaParseUrl: RPCDef<{ url: string }, DanmakuMetaExternal>
  searchDanDanPlay: RPCDef<MediaSearchParams, DanDanPlayMediaSearchResult>
  searchBilibili: RPCDef<MediaSearchParams, BilibiliMediaSearchResult>
  searchTencent: RPCDef<MediaSearchParams, TencentMediaSearchResult>
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
}

type ControlMethods = {
  getFrameId: RPCDef<void, number>
  getAllFrames: RPCDef<void, chrome.webNavigation.GetAllFrameResultDetails[]>
  injectScript: RPCDef<number, void>
}

type WithFrameId<TInput> = { input: TInput } & { frameId: number }

// Controller -> Player communication
export type PlayerCommands = {
  mount: RPCDef<CommentEntity[], void>
  unmount: RPCDef<void, void>
  start: RPCDef<string, void>
}

// Player -> Controller communication
export type PlayerEvents = {
  onReady: RPCDef<WithFrameId<void>, void>
  onVideoChange: RPCDef<WithFrameId<void>, void>
  onVideoRemoved: RPCDef<WithFrameId<void>, void>
}

/* eslint-enable @typescript-eslint/consistent-type-definitions */

export type BackgroundMethods = IconMethods &
  AnimeMethods &
  DanmakuMethods &
  ControlMethods
