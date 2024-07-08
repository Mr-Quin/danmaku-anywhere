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
  /**
   * Comment id
   */
  cid: number
  /**
   * Comma separated string in format of `time,mode,color,uid`
   * Uid may be a string
   */
  p: string
  /**
   * Comment text
   */
  m: string
}

export interface DanDanCommentAPIParams {
  /**
   * 起始弹幕编号，忽略此编号以前的弹幕。默认值为0
   */
  from: number
  /**
   * 是否同时获取关联的第三方弹幕。默认值为false
   */
  withRelated: boolean
  /**
   * 中文简繁转换。0-不转换，1-转换为简体，2-转换为繁体。
   */
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
