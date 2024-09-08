import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { danDanCommentResponseSchema } from '@danmaku-anywhere/danmaku-converter'

import { handleParseResponse } from '../utils/index.js'

import { DanDanPlayApiException } from './exceptions.js'
import type {
  DanDanAnimeSearchAPIParams,
  DanDanAnimeSearchResult,
  DanDanBangumiAnimeResult,
  DanDanCommentAPIParams,
} from './schema.js'
import {
  danDanAnimeSearchResponseSchema,
  danDanBangumiAnimeResponseSchema,
} from './schema.js'

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
}: DanDanAnimeSearchAPIParams) => {
  const url = createUrl({
    path: '/api/v2/search/episodes',
    params: {
      anime,
      episode,
    },
  })

  const res = await fetch(url)

  const json = await res.json()

  const data = handleParseResponse(() =>
    danDanAnimeSearchResponseSchema.parse(json)
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes satisfies DanDanAnimeSearchResult
}

export const fetchComments = async (
  episodeId: number,
  params: Partial<DanDanCommentAPIParams> = {}
): Promise<CommentEntity[]> => {
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

  const json = await res.json()

  return handleParseResponse(() => danDanCommentResponseSchema.parse(json))
    .comments
}

export const getBangumiAnime = async (animeId: number) => {
  const url = createUrl({
    path: `/api/v2/bangumi/${animeId}`,
  })

  const res = await fetch(url)

  const json = await res.json()

  const data = handleParseResponse(() =>
    danDanBangumiAnimeResponseSchema.parse(json)
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.bangumi satisfies DanDanBangumiAnimeResult
}
