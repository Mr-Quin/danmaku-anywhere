import type {
  CustomSeason,
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'

export interface SeasonSearchParams {
  keyword: string
}

export interface IDanmakuProvider {
  search(params: SeasonSearchParams): Promise<SeasonInsert[] | CustomSeason[]>

  getEpisodes(seasonId: number): Promise<WithSeason<EpisodeMeta>[]>

  getDanmaku(request: DanmakuFetchRequest): Promise<WithSeason<Episode>>

  refreshSeason?(season: Season): Promise<void>

  preloadNextEpisode?(request: DanmakuFetchRequest): Promise<void>

  canParse?(url: string): boolean
  parseUrl?(url: string): Promise<WithSeason<EpisodeMeta> | null>
  findEpisode?(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null>
}
