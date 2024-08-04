import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'

import type { DanmakuFetchOptions } from './types'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DDPDanmakuMeta } from '@/common/danmaku/models/danmakuMeta'

export interface DanmakuGetOneDto {
  type: DanmakuSourceType
  id: number
}

export interface DanmakuFetchDDPDto {
  meta: DDPDanmakuMeta
  params?: Partial<DanDanCommentAPIParams>
  options?: DanmakuFetchOptions
}

export interface DanmakuDeleteDto {
  type: DanmakuSourceType
  id: number
}
