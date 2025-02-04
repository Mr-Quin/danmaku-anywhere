import type { GetCommentQuery } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuFetchOptions } from './types'

import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  BiliBiliMeta,
  DanDanPlayMetaDto,
  TencentMeta,
} from '@/common/danmaku/models/meta'

export type DanmakuGetOneDto =
  | {
      id: number
    }
  | {
      provider: DanmakuSourceType
      episodeId: number | string
    }

export type DanmakuGetManyDto = number[]

export interface DanmakuGetBySeasonDto {
  // Get by anime is unsupported for custom danmaku
  provider: DanmakuSourceType.DanDanPlay
  // Season id
  id: number
}

export interface DanmakuFetchContext {
  // Title mapping key
  key: string
}

interface BaseDanmakuFetchDto {
  context?: DanmakuFetchContext
  options?: DanmakuFetchOptions
}

export interface DanDanPlayFetchDto extends BaseDanmakuFetchDto {
  meta: DanDanPlayMetaDto
  params?: Partial<GetCommentQuery>
}

export interface BiliBiliFetchDto extends BaseDanmakuFetchDto {
  meta: BiliBiliMeta
}

export interface TencentFetchDto extends BaseDanmakuFetchDto {
  meta: TencentMeta
}

export type DanmakuFetchDto =
  | DanDanPlayFetchDto
  | BiliBiliFetchDto
  | TencentFetchDto

export type DanmakuDeleteDto = number

export interface CustomDanmakuCreateData {
  comments: {
    p: string
    m: string
  }[]
  seasonTitle: string
  episodeTitle: string
}
