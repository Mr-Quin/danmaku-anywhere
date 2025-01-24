import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { danDanCommentResponseSchema } from '@danmaku-anywhere/danmaku-converter'

import { handleParseResponse } from '../utils/index.js'

import { DanDanPlayApiException } from './exceptions.js'
import type {
  DanDanSearchEpisodesAPIParams,
  DanDanSearchEpisodesResult,
  DanDanBangumiAnimeResult,
  DanDanCommentAPIParams,
  DanDanSearchAnimeDetails,
} from './schema.js'
import {
  danDanSearchAnimeDetailsResponseSchema,
  danDanSearchEpisodesResponseSchema,
  danDanBangumiAnimeResponseSchema,
} from './schema.js'

export const API_ROOT = 'https://api.dandanplay.net'

const store = {
  baseUrl: API_ROOT,
  APP_ID: '',
  APP_SECRET: '',
}

export const configure = (options: Partial<typeof store>) => {
  Object.assign(store, options)
}

const sha256 = async (message: string) => {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => String.fromCharCode(b)).join('')
  return btoa(hash)
}

interface DanDanPlayInit {
  path: string
  params?: Record<string, string>
}

const createUrl = ({ path, params }: DanDanPlayInit) => {
  const { baseUrl } = store

  if (!params) {
    return `${baseUrl}${path}`
  }

  return `${baseUrl}${path}?${new URLSearchParams(params)}`
}

const getHeaders = async (path: string) => {
  // if either APP_ID or APP_SECRET is not set, continue without headers
  if (!store.APP_ID || !store.APP_SECRET) {
    return {}
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()

  const hash = await sha256(
    `${store.APP_ID}${timestamp}${path}${store.APP_SECRET}`
  )

  const headers = {
    'X-AppId': store.APP_ID,
    'X-Timestamp': timestamp,
    'X-Signature': hash,
    'X-Auth': '1',
  }

  return headers
}

const fetchDanDanPlay = async (init: DanDanPlayInit) => {
  const { path } = init

  const url = createUrl(init)

  const headers = await getHeaders(path)

  const res = await fetch(url, {
    headers: {
      ...headers,
    },
  })

  if (res.status >= 400) {
    throw new Error(
      `Request failed with status ${res.status}: ${res.statusText}
      ${await res.text()}`
    )
  }

  const json: unknown = await res.json()

  return json
}

export const searchAnime = async (keyword: string) => {
  const json = await fetchDanDanPlay({
    path: '/api/v2/search/anime',
    params: {
      keyword,
    },
  })

  const data = handleParseResponse(() =>
    danDanSearchAnimeDetailsResponseSchema.parse(json)
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes satisfies DanDanSearchAnimeDetails[]
}

export const searchEpisodes = async ({
  anime,
  episode = '',
}: DanDanSearchEpisodesAPIParams) => {
  const json = await fetchDanDanPlay({
    path: '/api/v2/search/episodes',
    params: {
      anime,
      episode,
    },
  })

  const data = handleParseResponse(() =>
    danDanSearchEpisodesResponseSchema.parse(json)
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes satisfies DanDanSearchEpisodesResult
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

  const json = await fetchDanDanPlay({
    path: `/api/v2/comment/${episodeId.toString()}`,
    params: convertedParams,
  })

  return handleParseResponse(() => danDanCommentResponseSchema.parse(json))
    .comments
}

export const getBangumiAnime = async (animeId: number) => {
  const json = await fetchDanDanPlay({
    path: `/api/v2/bangumi/${animeId}`,
  })

  const data = handleParseResponse(() =>
    danDanBangumiAnimeResponseSchema.parse(json)
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.bangumi satisfies DanDanBangumiAnimeResult
}
