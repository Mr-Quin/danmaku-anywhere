import type { ReactNode } from 'react'

import type {
  BilibiliEpisode,
  DanDanPlayEpisode,
  SeasonSearchResult,
} from '@/common/anime/dto'
import type { DanmakuProviderType } from '@/common/anime/enums'

export type RenderEpisodeData =
  | {
      provider: DanmakuProviderType.Bilibili
      episode: BilibiliEpisode
      season: Extract<
        SeasonSearchResult,
        { provider: DanmakuProviderType.Bilibili }
      >['data']
    }
  | {
      provider: DanmakuProviderType.DanDanPlay
      episode: DanDanPlayEpisode
      season: Extract<
        SeasonSearchResult,
        { provider: DanmakuProviderType.DanDanPlay }
      >['data']
    }

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode
