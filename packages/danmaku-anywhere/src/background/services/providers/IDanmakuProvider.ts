import type {
  CommentEntity,
  CustomSeason,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'

export type OmitSeasonId<T> = Omit<T, 'seasonId'>

export interface SeasonSearchParams {
  keyword: string
}

export interface EpisodeList {
  episodes: OmitSeasonId<EpisodeMeta>[]
  // The source returned rows that were dropped as invalid, so the list may
  // be missing episodes the source has.
  partial: boolean
}

export interface ParseUrlResult {
  episodeMeta: OmitSeasonId<EpisodeMeta>
  seasonInsert: SeasonInsert
}

export interface IDanmakuProvider {
  search(params: SeasonSearchParams): Promise<SeasonInsert[] | CustomSeason[]>

  getSeason?(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null>

  getEpisodes?(seasonRemoteIds: Season['providerIds']): Promise<EpisodeList>

  getDanmaku?(request: DanmakuFetchByMeta): Promise<CommentEntity[]>

  findEpisode?(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null>

  canParse?(url: string): boolean

  parseUrl?(url: string): Promise<ParseUrlResult | null>
}
