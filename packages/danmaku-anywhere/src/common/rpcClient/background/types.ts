import type {
  DanDanAnime,
  DanDanAnimeSearchAPIParams,
} from '@danmaku-anywhere/danmaku-provider/ddp'

import type { RPCDef } from '../../rpc/types'

import type {
  DanmakuDeleteDto,
  DanmakuFetchDDPDto,
  DanmakuGetByAnimeDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/dto'
import type {
  CustomDanmakuCreateData,
  DanmakuCache,
  DanmakuImport,
  DanmakuCacheLite,
  DanDanPlayDanmakuCache,
} from '@/common/danmaku/models/danmakuCache/dto'
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
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DanmakuMethods = {
  danmakuGetAll: RPCDef<void, DanmakuCache[]>
  danmakuGetAllLite: RPCDef<void, DanmakuCacheLite[]>
  danmakuGetOne: RPCDef<DanmakuGetOneDto, DanmakuCache | null>
  danmakuGetMany: RPCDef<DanmakuGetOneDto[], DanmakuCache[]>
  danmakuGetByAnime: RPCDef<DanmakuGetByAnimeDto, DanmakuCache[]>
  danmakuFetchDDP: RPCDef<DanmakuFetchDDPDto, DanDanPlayDanmakuCache>
  danmakuCreateCustom: RPCDef<CustomDanmakuCreateData[], void>
  danmakuImport: RPCDef<DanmakuImport[], void>
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
