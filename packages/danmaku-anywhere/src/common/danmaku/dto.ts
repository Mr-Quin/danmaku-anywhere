import type { DanDanCommentAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanmakuFetchOptions } from './types'

import type {
  DanmakuSourceType,
  HasIntegrationType,
} from '@/common/danmaku/enums'
import type {
  BiliBiliMeta,
  DanDanPlayMetaDto,
} from '@/common/danmaku/models/meta'

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

export interface DanmakuFetchContext {
  integration: HasIntegrationType
  // Title mapping key
  key: string
}

interface BaseDanmakuFetchDto {
  context?: DanmakuFetchContext
  options?: DanmakuFetchOptions
}

export interface DanDanPlayFetchDto extends BaseDanmakuFetchDto {
  meta: DanDanPlayMetaDto
  params?: Partial<DanDanCommentAPIParams>
}

export interface BiliBiliFetchDto extends BaseDanmakuFetchDto {
  meta: BiliBiliMeta
}

export type DanmakuFetchDto = DanDanPlayFetchDto | BiliBiliFetchDto

export type DanmakuDeleteDto = number

export interface CustomDanmakuCreateData {
  comments: {
    p: string
    m: string
  }[]
  seasonTitle: string
  episodeTitle: string
}
