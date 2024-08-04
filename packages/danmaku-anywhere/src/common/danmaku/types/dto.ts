import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'
import type { z } from 'zod'

import type { customDanmakuCreateDtoSchema } from '../schema/customDanmaku'

import type { DanmakuFetchOptions, DDPDanmakuMeta } from './types'

import type { DanmakuSourceType } from '@/common/danmaku/types/enums'

export type CustomDanmakuCreateDtoSingle = z.infer<
  typeof customDanmakuCreateDtoSchema
>

export type CustomDanmakuCreateDto = CustomDanmakuCreateDtoSingle[]

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
