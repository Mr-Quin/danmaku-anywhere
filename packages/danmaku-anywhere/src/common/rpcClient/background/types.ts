import type {
  BilibiliBangumiInfo,
  BilibiliUserInfo,
} from '@danmaku-anywhere/danmaku-provider/bilibili'

import type { RPCDef } from '../../rpc/types'

import type {
  GetEpisodeDto,
  MatchEpisodeInput,
  MatchEpisodeResult,
  MediaSearchMultiParamsData,
  MediaSearchParamsData,
  MediaSearchResult,
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
  episodesGet: RPCDef<GetEpisodeDto, BilibiliBangumiInfo>
  episodeMatch: RPCDef<MatchEpisodeInput, MatchEpisodeResult>
  bilibiliSetCookies: RPCDef<void, void>
  bilibiliGetLoginStatus: RPCDef<void, BilibiliUserInfo>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DanmakuMethods = {
  danmakuGetAll: RPCDef<void, Danmaku[]>
  danmakuGetAllLite: RPCDef<void, DanmakuLite[]>
  danmakuGetOne: RPCDef<DanmakuGetOneDto, Danmaku | null>
  danmakuGetMany: RPCDef<DanmakuGetManyDto, Danmaku[]>
  danmakuGetByAnime: RPCDef<DanmakuGetBySeasonDto, Danmaku[]>
  danmakuFetch: RPCDef<DanmakuFetchDto, Danmaku>
  danmakuCreateCustom: RPCDef<CustomDanmakuCreateData[], void>
  danmakuImport: RPCDef<DanmakuInsert[], void>
  danmakuDelete: RPCDef<DanmakuDeleteDto, void>
  danmakuDeleteAll: RPCDef<void, void>
}

export type BackgroundMethods = IconMethods & AnimeMethods & DanmakuMethods
