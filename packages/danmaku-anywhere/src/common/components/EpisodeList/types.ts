import type {
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { ParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/generic'
import type { ReactNode } from 'react'

type RenderEpisodeData = {
  episode: WithSeason<EpisodeMeta>
  danmaku: WithSeason<EpisodeLite> | null
  isLoading: boolean
}

type RenderCustomEpisodeData = {
  episode: ParsedPlayUrl
}

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode
export type RenderCustomEpisode = (data: RenderCustomEpisodeData) => ReactNode
