import type {
  DanDanAnime,
  DanDanAnimeSearchAPIParams,
  DanDanCommentAPIParams,
  DanDanCommentAPIResult,
} from '@danmaku-anywhere/dandanplay-api'

import type {
  DanmakuCache,
  DanmakuCacheLite,
  DanmakuMeta,
  TitleMapping,
} from '../../db/db'
import type { DanmakuFetchOptions } from '../../types/DanmakuFetchOptions'
import type { RPCDef } from '../rpc'

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
  danmakuGetByEpisodeId: RPCDef<number, DanmakuCache | null>
  danmakuFetch: RPCDef<
    {
      data: DanmakuMeta
      params?: Partial<DanDanCommentAPIParams>
      options?: DanmakuFetchOptions
    },
    DanDanCommentAPIResult
  >
  danmakuDelete: RPCDef<number, void>
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
