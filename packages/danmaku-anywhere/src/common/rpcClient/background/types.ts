import type {
  DanDanAnime,
  DanDanAnimeSearchAPIParams,
} from '@danmaku-anywhere/dandanplay-api'

import type { RPCDef } from '../../rpc/types'

import type {
  DanmakuDeleteDto,
  DanmakuFetchDDPDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/dto'
import type {
  DanmakuCache,
  DanmakuCacheImportDto,
  DanmakuCacheLite,
  DDPDanmakuCache,
} from '@/common/danmaku/models/danmakuCache/dto'
import type { CustomDanmakuCreateDto } from '@/common/danmaku/models/danmakuImport/customDanmaku'
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
  danmakuFetchDDP: RPCDef<DanmakuFetchDDPDto, DDPDanmakuCache>
  danmakuCreateCustom: RPCDef<CustomDanmakuCreateDto[], void>
  danmakuImport: RPCDef<DanmakuCacheImportDto[], void>
  danmakuDelete: RPCDef<DanmakuDeleteDto, void>
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
