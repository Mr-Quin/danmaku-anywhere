import type {
  CustomSeason,
  Episode,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import type { SeasonSearchParams } from '@/common/anime/dto'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

export interface IDanmakuProvider {
  search(
    params: SeasonSearchParams,
    config: ProviderConfig
  ): Promise<Season[] | CustomSeason[]>

  getEpisodes(
    seasonId: number,
    config: ProviderConfig
  ): Promise<WithSeason<EpisodeMeta>[]>

  getDanmaku(
    request: DanmakuFetchRequest,
    config: ProviderConfig
  ): Promise<WithSeason<Episode>>

  refreshSeason?(season: Season, config: ProviderConfig): Promise<void>

  preloadNextEpisode?(
    request: DanmakuFetchRequest,
    config: ProviderConfig
  ): Promise<void>

  canParse?(url: string): boolean
  parseUrl?(url: string): Promise<WithSeason<EpisodeMeta> | null>
  findEpisode?(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta> | null>
}
