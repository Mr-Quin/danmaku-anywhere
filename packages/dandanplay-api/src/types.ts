export interface DanDanEpisode {
  episodeId: number
  episodeTitle: string
}

export interface DanDanAnime {
  animeId: number
  animeTitle: string
  type:
    | 'jpdrama'
    | 'tvseries'
    | 'movie'
    | 'ova'
    | 'web'
    | 'musicvideo'
    | 'other'
  typeDescription: string
  episodes: DanDanEpisode[]
}

export interface DanDanAnimeSearchAPIParams {
  anime: string
  episode?: string
}

export interface DanDanApiResponse {
  errorCode: number
  errorMessage: string
  success: boolean
}
export interface DanDanAnimeSearchResult extends DanDanApiResponse {
  animes: DanDanAnime[]
  hasMore: boolean
}

export enum DanDanChConvert {
  None = 0,
  Simplified = 1,
  Traditional = 2,
}

export enum DanDanCommentMode {
  ltr = 6,
  rtl = 1,
  top = 5,
  bottom = 4,
}

export interface DanDanComment {
  cid: number
  p: string
  m: string
}

export interface DanDanCommentAPIParams {
  from: number
  withRelated: boolean
  chConvert: DanDanChConvert
}

export interface DanDanCommentAPIResult {
  count: number
  comments: DanDanComment[]
}

export interface DanDanBangumiAnimeResult extends DanDanApiResponse {
  bangumi: {
    type: string
    typeDescription: string
    titles: {
      language: string
      title: string
    }[]
    episodes: {
      episodeId: number
      episodeTitle: string
      episodeNumber: number
    }[]
    summary: string
    metadata: string[]
  }
}
