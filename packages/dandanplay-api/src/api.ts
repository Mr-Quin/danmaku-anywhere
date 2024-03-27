import type {
  DanDanAnimeSearchAPIParams,
  DanDanAnimeSearchResult,
  DanDanBangumiAnimeResult,
  DanDanCommentAPIParams,
  DanDanCommentAPIResult,
} from './types'

const API_ROOT = 'https://api.dandanplay.net'

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

export const getAnime = async (animeId: number) => {
  const res = await fetch(`${API_ROOT}/api/v2/bangumi/${animeId}`)

  const json = (await res.json()) as DanDanBangumiAnimeResult

  if (!json.success) {
    throw new Error(json.errorMessage)
  }

  return json
}
