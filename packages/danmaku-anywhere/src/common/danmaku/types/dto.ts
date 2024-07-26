import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'

import type { CustomDanmakuCreateSchema } from '../schema'

import type { DanmakuFetchOptions, DDPDanmakuMeta } from './types'

import type { DanmakuSourceType } from '@/common/danmaku/types/enums'

export type CustomDanmakuCreateDto = CustomDanmakuCreateSchema[]

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
