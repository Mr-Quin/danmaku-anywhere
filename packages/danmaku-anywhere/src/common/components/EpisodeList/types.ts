import type {
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { MacCmsParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/maccms'
import type { ReactNode } from 'react'

type RenderEpisodeData = {
  episode: WithSeason<EpisodeMeta>
  danmaku: WithSeason<EpisodeLite> | null
  isLoading: boolean
}

type RenderCustomEpisodeData = {
  episode: MacCmsParsedPlayUrl
}

export type RenderEpisode = (data: RenderEpisodeData) => ReactNode
export type RenderCustomEpisode = (data: RenderCustomEpisodeData) => ReactNode
