import type {
  DanDanAnime,
  DanDanAnimeSearchAPIParams,
} from '@danmaku-anywhere/dandanplay-api'

import type { RPCDef } from '../rpc'

import type {
  DDPDanmakuCache,
  DanmakuCache,
  DanmakuCacheLite,
  DanmakuDeleteDto,
  DanmakuFetchDDPDto,
  DanmakuGetOneDto,
  TitleMapping,
} from '@/common/types/Danmaku'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type IconMethods = {
  iconSet: RPCDef<'active' | 'inactive' | 'available' | 'unavailable', void>
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
