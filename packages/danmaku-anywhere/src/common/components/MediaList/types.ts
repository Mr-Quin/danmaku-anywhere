import type { Season } from '@danmaku-anywhere/danmaku-converter'
import type {
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { ReactNode } from 'react'

export type RenderEpisodeData = {
  episode: WithSeason<EpisodeMeta>
  danmaku: WithSeason<EpisodeLite> | null
  isLoading: boolean
}

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode

export type HandleSeasonClick = (season: Season) => void
