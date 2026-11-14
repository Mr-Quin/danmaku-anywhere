import type {
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-model'
import type { MacCmsParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/maccms'
import type { ReactNode } from 'react'

export type RenderEpisodeData = {
  episode: WithSeason<EpisodeMeta>
  danmaku: WithSeason<EpisodeLite> | null
  isLoading: boolean
  index: number
}

export type RenderCustomEpisodeData = {
  episode: MacCmsParsedPlayUrl
  index: number
}

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode
export type RenderCustomEpisode = (data: RenderCustomEpisodeData) => ReactNode
