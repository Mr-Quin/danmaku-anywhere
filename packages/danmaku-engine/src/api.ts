const API_ROOT = 'https://api.dandanplay.net'

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

export type DanDanAnimeSearchAPIParams = {
  anime: string
  episode?: string
}

export interface DanDanAnimeSearchResult {
  animes: DanDanAnime[]
  errorCode: number
  errorMessage: string
  hasMore: boolean
  success: boolean
}

export const searchAnime = async ({
  anime,
  episode = '',
}: DanDanAnimeSearchAPIParams): Promise<DanDanAnimeSearchResult> => {
  const url = `${API_ROOT}/api/v2/search/episodes?${new URLSearchParams({
    anime,
    episode,
  })}`

  const res = await fetch(url)

  const json = (await res.json()) as DanDanAnimeSearchResult

  if (!json.success) {
    throw new Error(json.errorMessage)
  }

  return json
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

export const fetchComments = async (
  episodeId: number,
  params: Partial<DanDanCommentAPIParams> = {}
): Promise<DanDanCommentAPIResult> => {
  const convertedParams = {
    from: params.from?.toString() ?? '0',
    withRelated: params.withRelated?.toString() ?? 'false',
    chConvert: params.chConvert?.toString() ?? '0',
  }

  const url = `${API_ROOT}/api/v2/comment/${episodeId.toString()}?${new URLSearchParams(
    convertedParams
  )}`

  const res = await fetch(url)

  const json = (await res.json()) as DanDanCommentAPIResult

  return json
}
