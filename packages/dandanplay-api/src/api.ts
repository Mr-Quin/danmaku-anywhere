import type {
  DanDanAnimeSearchAPIParams,
  DanDanAnimeSearchResult,
  DanDanBangumiAnimeResult,
  DanDanCommentAPIParams,
  DanDanCommentAPIResult,
} from './types'

export const API_ROOT = 'https://api.dandanplay.net'

const store = {
  baseUrl: API_ROOT,
}

export const configure = (options: { baseUrl: string }) => {
  store.baseUrl = options.baseUrl
}

const createUrl = ({
  path,
  params,
  baseUrl: baseUrlProp,
}: {
  path: string
  params?: Record<string, string>
  baseUrl?: string
}) => {
  const baseUrl = baseUrlProp || store.baseUrl

  if (!params) {
    return `${baseUrl}${path}`
  }

  return `${baseUrl}${path}?${new URLSearchParams(params)}`
}

export const searchAnime = async ({
  anime,
  episode = '',
}: DanDanAnimeSearchAPIParams): Promise<DanDanAnimeSearchResult> => {
  const url = createUrl({
    path: '/api/v2/search/episodes',
    params: {
      anime,
      episode,
    },
  })

  const res = await fetch(url)

  const json = (await res.json()) as DanDanAnimeSearchResult

  if (!json.success) {
    throw new Error(json.errorMessage)
  }

  return json
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

  const url = createUrl({
    path: `/api/v2/comment/${episodeId.toString()}`,
    params: convertedParams,
  })

  const res = await fetch(url)

  const json = (await res.json()) as DanDanCommentAPIResult

  return json
}

export const getAnime = async (animeId: number) => {
  const url = createUrl({
    path: `/api/v2/bangumi/${animeId}`,
  })

  const res = await fetch(url)

  const json = (await res.json()) as DanDanBangumiAnimeResult

  if (!json.success) {
    throw new Error(json.errorMessage)
  }

  return json
}
