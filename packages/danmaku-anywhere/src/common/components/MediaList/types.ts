import type { ReactNode } from 'react'

import type {
  BilibiliEpisode,
  DanDanPlayEpisode,
  SeasonSearchResult,
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

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode
