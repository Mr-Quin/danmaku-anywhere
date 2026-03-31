import type {
  CommentEntity,
  CustomSeason,
  DanmakuSourceType,
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

export interface ParseUrlResult {
  episodeMeta: OmitSeasonId<EpisodeMeta>
  seasonInsert: SeasonInsert
}

export interface IDanmakuProvider {
  forProvider: DanmakuSourceType

  search(params: SeasonSearchParams): Promise<SeasonInsert[] | CustomSeason[]>

  getSeason?(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null>

  getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<OmitSeasonId<EpisodeMeta>[]>

  getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]>

  preloadNextEpisode?(request: DanmakuFetchByMeta): Promise<void>

  canParse?(url: string): boolean

  parseUrl?(url: string): Promise<ParseUrlResult | null>

  findEpisode?(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null>
}
