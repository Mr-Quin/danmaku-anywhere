import type { ReactNode } from 'react'

import type {
  BilibiliEpisode,
  DanDanPlayEpisode,
  SeasonSearchResult,
  TencentEpisode,
} from '@/common/anime/dto'
import type { DanmakuSourceType } from '@/common/danmaku/enums'

export type RenderEpisodeData =
  | {
      provider: DanmakuSourceType.Bilibili
      episode: BilibiliEpisode
      season: Extract<
        SeasonSearchResult,
        { provider: DanmakuSourceType.Bilibili }
      >['data']
    }
  | {
      provider: DanmakuSourceType.DanDanPlay
      episode: DanDanPlayEpisode
      season: Extract<
        SeasonSearchResult,
        { provider: DanmakuSourceType.DanDanPlay }
      >['data']
    }
  | {
      provider: DanmakuSourceType.Tencent
      episode: TencentEpisode
      season: Extract<
        SeasonSearchResult,
        { provider: DanmakuSourceType.Tencent }
      >['data']
    }

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode
