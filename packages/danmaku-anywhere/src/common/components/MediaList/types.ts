import type { ReactNode } from 'react'

import type {
  BilibiliEpisode,
  DanDanPlayEpisode,
  SeasonSearchResult,
} from '@/common/anime/dto'
import type { DanmakuProviderType } from '@/common/anime/enums'

export type RenderEpisode = (
  ...args:
    | [
        DanmakuProviderType.Bilibili,
        BilibiliEpisode,
        Extract<
          SeasonSearchResult,
          { provider: DanmakuProviderType.Bilibili }
        >['data'],
      ]
    | [
        DanmakuProviderType.DanDanPlay,
        DanDanPlayEpisode,
        Extract<
          SeasonSearchResult,
          { provider: DanmakuProviderType.DanDanPlay }
        >['data'],
      ]
) => ReactNode
