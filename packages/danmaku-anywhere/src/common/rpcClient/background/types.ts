import type { BilibiliBangumiInfo } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type {
  DanDanAnime,
  DanDanAnimeSearchAPIParams,
} from '@danmaku-anywhere/danmaku-provider/ddp'

import type { RPCDef } from '../../rpc/types'

import type {
  MediaSearchMultiParamsData,
  MediaSearchParamsData,
  MediaSearchResult,
} from '@/common/anime/dto'
import type {
  DanmakuDeleteDto,
  DanmakuFetchDDPDto,
  DanmakuGetBySeasonDto,
  DanmakuGetManyDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/dto'
import type {
  DanDanPlayDanmaku,
  Danmaku,
  DanmakuInsert,
  DanmakuLite,
} from '@/common/danmaku/models/danmakuCache/db'
import type { CustomDanmakuCreateData } from '@/common/danmaku/models/danmakuCache/dto'
import type { TitleMapping } from '@/common/danmaku/models/titleMapping'

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
  animeSearch: RPCDef<DanDanAnimeSearchAPIParams, DanDanAnime[]>
  mediaSearch: RPCDef<MediaSearchParamsData, MediaSearchResult>
  mediaSearchMultiple: RPCDef<MediaSearchMultiParamsData, MediaSearchResult[]>
  getBilibiliEpisode: RPCDef<number, BilibiliBangumiInfo>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DanmakuMethods = {
  danmakuGetAll: RPCDef<void, Danmaku[]>
  danmakuGetAllLite: RPCDef<void, DanmakuLite[]>
  danmakuGetOne: RPCDef<DanmakuGetOneDto, Danmaku | null>
  danmakuGetMany: RPCDef<DanmakuGetManyDto, Danmaku[]>
  danmakuGetByAnime: RPCDef<DanmakuGetBySeasonDto, Danmaku[]>
  danmakuFetchDDP: RPCDef<DanmakuFetchDDPDto, DanDanPlayDanmaku>
  danmakuCreateCustom: RPCDef<CustomDanmakuCreateData[], void>
  danmakuImport: RPCDef<DanmakuInsert[], void>
  danmakuDelete: RPCDef<DanmakuDeleteDto, void>
  danmakuDeleteAll: RPCDef<void, void>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TitleMappingMethods = {
  titleMappingSet: RPCDef<TitleMapping, void>
  titleMappingGet: RPCDef<
    Pick<TitleMapping, 'originalTitle' | 'integration'>,
    TitleMapping | null
  >
}

export type BackgroundMethods = IconMethods &
  AnimeMethods &
  DanmakuMethods &
  TitleMappingMethods
