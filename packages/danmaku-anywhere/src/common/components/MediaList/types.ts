import { SeasonV1 } from '@/common/anime/types/v1/schema'
import {
  EpisodeLiteV4,
  EpisodeMeta,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'
import type { ReactNode } from 'react'

export type RenderEpisodeData = {
  episode: WithSeason<EpisodeMeta>
  danmaku: EpisodeLiteV4 | null
  isLoading: boolean
}

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode

export type HandleSeasonClick = (season: SeasonV1) => void
