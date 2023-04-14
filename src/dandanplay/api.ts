import { logger } from '@/utils/logger'

const apiRoot = 'https://api.dandanplay.net'

export interface SearchAPIParams {
  anime: string
  episode: string
}

export interface DanDanEpisode {
  episodeId: number
  episodeTitle: string
}

export interface DanDanMedia {
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

export interface DanDanEpisodeSearchResult {
  animes: DanDanMedia[]
  errorCode: number
  errorMessage: string
  hasMore: boolean
  success: boolean
}

export const searchAPI = async (
  params: Partial<SearchAPIParams>
): Promise<DanDanEpisodeSearchResult> => {
  const url = `${apiRoot}/api/v2/search/episodes?${new URLSearchParams(params)}`

  logger.debug('Dispatching search request', params)

  const res = await fetch(url)

  const json = (await res.json()) as DanDanEpisodeSearchResult

  logger.debug('Search result', json)

  return json
}

enum ChConvert {
  None = 0,
  Simplified = 1,
  Traditional = 2,
}

export interface CommentAPIParams {
  from: number
  withRelated: boolean
  chConvert: ChConvert
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

export interface DanDanCommentGetResult {
  count: number
  comments: DanDanComment[]
}

export const commentAPI = async (
  episodeId: number,
  params: Partial<CommentAPIParams>
): Promise<DanDanCommentGetResult> => {
  const convertedParams = {
    from: params.from?.toString() ?? '0',
    withRelated: params.withRelated?.toString() ?? 'false',
    chConvert: params.chConvert?.toString() ?? '0',
  }

  logger.debug('Dispatching damaku request', episodeId, params)

  const url = `${apiRoot}/api/v2/comment/${episodeId.toString()}?${new URLSearchParams(
    convertedParams
  )}`

  const res = await fetch(url)

  const json = (await res.json()) as DanDanCommentGetResult

  logger.debug('Danmaku result', json)

  return json
}
