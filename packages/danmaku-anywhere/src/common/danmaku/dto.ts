import type { DanDanCommentAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuFetchOptions } from './types'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/danmakuMeta'

export interface DanmakuGetOneDto {
  type: DanmakuSourceType
  // Episode id
  id: number
}

export interface DanmakuGetByAnimeDto {
  // Get by anime is unsupported for custom danmaku
  type: DanmakuSourceType.DDP
  // Anime id
  id: number
}

export interface DanmakuFetchDDPDto {
  meta: DanDanPlayMeta
  params?: Partial<DanDanCommentAPIParams>
  options?: DanmakuFetchOptions
}

export interface DanmakuDeleteDto {
  type: DanmakuSourceType
  id: number
}
