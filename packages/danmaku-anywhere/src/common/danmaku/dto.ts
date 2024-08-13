import type { DanDanCommentAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuFetchOptions } from './types'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/danmakuMeta'

export type DanmakuGetOneDto =
  | {
      id: number
    }
  | {
      provider: DanmakuSourceType
      episodeId: number
    }

export type DanmakuGetManyDto = number[]

export interface DanmakuGetBySeasonDto {
  // Get by anime is unsupported for custom danmaku
  provider: DanmakuSourceType.DDP
  // Season id
  id: number
}

export interface DanmakuFetchDDPDto {
  meta: DanDanPlayMeta
  params?: Partial<DanDanCommentAPIParams>
  options?: DanmakuFetchOptions
}

export type DanmakuDeleteDto = number
