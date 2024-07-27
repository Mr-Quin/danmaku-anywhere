import type {
  DanDanAnime,
  DanDanAnimeSearchAPIParams,
} from '@danmaku-anywhere/dandanplay-api'

import type { RPCDef } from '../../rpc/types'

import type {
  CustomDanmakuCreateDto,
  DanmakuDeleteDto,
  DanmakuFetchDDPDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/types/dto'
import type {
  DanmakuCache,
  DanmakuCacheLite,
  DDPDanmakuCache,
  TitleMapping,
} from '@/common/danmaku/types/types'

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
  danmakuFetchDDP: RPCDef<DanmakuFetchDDPDto, DDPDanmakuCache>
  danmakuCreateCustom: RPCDef<CustomDanmakuCreateDto, void>
  danmakuDelete: RPCDef<DanmakuDeleteDto, void>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TitleMappingMethods = {
  titleMappingSet: RPCDef<TitleMapping, void>
  titleMappingGet: RPCDef<
    Pick<TitleMapping, 'originalTitle' | 'source'>,
    TitleMapping | null
  >
}

export type BackgroundMethods = IconMethods &
  AnimeMethods &
  DanmakuMethods &
  TitleMappingMethods