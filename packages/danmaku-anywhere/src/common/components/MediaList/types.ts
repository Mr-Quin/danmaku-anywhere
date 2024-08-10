import { DanmakuProviderType } from '@/common/anime/enums'
import {
  BilibiliEpisode,
  DanDanPlayEpisode,
  SeasonSearchResult,
} from '@/common/anime/dto'
import { ReactNode } from 'react'

export interface RenderEpisode {
  (
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
  ): ReactNode
}
