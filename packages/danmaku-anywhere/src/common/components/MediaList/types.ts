import type { ReactNode } from 'react'

import type {
  BilibiliEpisode,
  BilibiliSeason,
  DanDanPlayEpisode,
  DanDanPlaySeason,
  TencentEpisode,
  TencentSeason,
} from '@/common/anime/dto'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'

export type RenderEpisodeData =
  | {
      provider: DanmakuSourceType.Bilibili
      episode: BilibiliEpisode
      season: BilibiliSeason
      danmaku: DanmakuLite | null
      isLoading: boolean
    }
  | {
      provider: DanmakuSourceType.DanDanPlay
      episode: DanDanPlayEpisode
      season: DanDanPlaySeason
      danmaku: DanmakuLite | null
      isLoading: boolean
    }
  | {
      provider: DanmakuSourceType.Tencent
      episode: TencentEpisode
      season: TencentSeason
      danmaku: DanmakuLite | null
      isLoading: boolean
    }

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode
