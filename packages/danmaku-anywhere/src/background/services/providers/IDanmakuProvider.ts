import type {
  CommentEntity,
  CustomSeason,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuFetchByMeta } from '@/common/danmaku/dto'
import type { SourceStatus } from '@/common/providers/sourceCapabilities'

export type OmitSeasonId<T> = Omit<T, 'seasonId'>

export interface SeasonSearchParams {
  keyword: string
}

export interface ParseUrlResult {
  episodeMeta: OmitSeasonId<EpisodeMeta>
  seasonInsert: SeasonInsert
}

interface ProviderBase {
  getStatus(): Promise<SourceStatus>

  search(params: SeasonSearchParams): Promise<SeasonInsert[] | CustomSeason[]>
}

export interface SearchOnlyProvider extends ProviderBase {
  readonly kind: 'searchOnly'

  search(params: SeasonSearchParams): Promise<CustomSeason[]>
}

export interface SourceProvider extends ProviderBase {
  readonly kind: 'source'

  search(params: SeasonSearchParams): Promise<SeasonInsert[]>

  getSeason(
    seasonRemoteIds: Season['providerIds']
  ): Promise<SeasonInsert | null>

  getEpisodes(
    seasonRemoteIds: Season['providerIds']
  ): Promise<OmitSeasonId<EpisodeMeta>[]>

  getDanmaku(request: DanmakuFetchByMeta): Promise<CommentEntity[]>

  findEpisode(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null>

  canParse(url: string): Promise<boolean>

  parseUrl(url: string): Promise<ParseUrlResult | null>
}

export type IDanmakuProvider = SearchOnlyProvider | SourceProvider
