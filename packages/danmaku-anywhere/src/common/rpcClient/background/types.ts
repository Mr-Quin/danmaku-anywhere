import type { BilibiliUserInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'

import type { RPCDef } from '../../rpc/types'

import type {
  BilibiliEpisode,
  MatchEpisodeInput,
  MatchEpisodeResult,
  MediaSearchMultiParamsData,
  MediaSearchParamsData,
  MediaSearchResult,
  TencentEpisode,
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type IconMethods = {
  iconSet: RPCDef<IconSetDto, void>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type AnimeMethods = {
  mediaSearch: RPCDef<MediaSearchParamsData, MediaSearchResult>
  mediaSearchMultiple: RPCDef<MediaSearchMultiParamsData, MediaSearchResult[]>
  mediaParseUrl: RPCDef<{ url: string }, DanmakuMetaExternal>
  episodesGetBilibili: RPCDef<number, BilibiliEpisode[]>
  episodesGetTencent: RPCDef<string, TencentEpisode[]>
  episodeMatch: RPCDef<MatchEpisodeInput, MatchEpisodeResult>
  bilibiliSetCookies: RPCDef<void, void>
  bilibiliGetLoginStatus: RPCDef<void, BilibiliUserInfo>
  tencentTestCookies: RPCDef<void, boolean>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
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

export type BackgroundMethods = IconMethods & AnimeMethods & DanmakuMethods
