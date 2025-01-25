import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import {
  commentOptionsToString,
  parseCommentEntityP,
  danDanCommentResponseSchema,
} from '@danmaku-anywhere/danmaku-converter'
import type { ZodSchema } from 'zod'

import { handleParseResponse } from '../utils/index.js'

import { DanDanPlayApiException } from './exceptions.js'
import type {
  DanDanSearchEpisodesAPIParams,
  DanDanSearchEpisodesResult,
  DanDanBangumiAnimeResult,
  DanDanCommentAPIParams,
  DanDanSearchAnimeDetails,
  DanDanRelatedItem,
} from './schema.js'
import {
  danDanRelatedSchema,
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

interface DanDanPlayInit<T = unknown> {
  path: string
  params?: Record<string, string>
  schema: ZodSchema<T>
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

const fetchDanDanPlay = async <T extends object>(init: DanDanPlayInit<T>) => {
  const { path, schema } = init

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

  const data = handleParseResponse(() => schema.parse(json))

  return data
}

export const searchAnime = async (
  keyword: string
): Promise<DanDanSearchAnimeDetails[]> => {
  const data = await fetchDanDanPlay({
    path: '/api/v2/search/anime',
    params: {
      keyword,
    },
    schema: danDanSearchAnimeDetailsResponseSchema,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes
}

export const searchEpisodes = async ({
  anime,
  episode = '',
}: DanDanSearchEpisodesAPIParams): Promise<DanDanSearchEpisodesResult> => {
  const data = await fetchDanDanPlay({
    path: '/api/v2/search/episodes',
    params: {
      anime,
      episode,
    },
    schema: danDanSearchEpisodesResponseSchema,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes
}

export const getComments = async (
  episodeId: number,
  params: Partial<DanDanCommentAPIParams> = {}
): Promise<CommentEntity[]> => {
  const convertedParams = {
    from: params.from?.toString() ?? '0',
    withRelated: params.withRelated?.toString() ?? 'false',
    chConvert: params.chConvert?.toString() ?? '0',
  }

  const data = await fetchDanDanPlay({
    path: `/api/v2/comment/${episodeId.toString()}`,
    params: convertedParams,
    schema: danDanCommentResponseSchema,
  })

  return data.comments
}

export const getCommentsWithRelated = async (
  episodeId: number,
  params: Partial<DanDanCommentAPIParams> = {}
): Promise<CommentEntity[]> => {
  const comments = await getComments(episodeId, {
    ...params,
    withRelated: false, // disable this flag to fetch related comments manually
  })

  if (params.withRelated) {
    try {
      const relatedData = await getRelated(episodeId)

      for (const entry of relatedData) {
        const additionalComments = await getExtComments(entry.url)

        additionalComments.forEach((comment) => {
          // if the shift is not 0, we need to adjust the time of the comments
          if (entry.shift !== 0) {
            const options = parseCommentEntityP(comment.p)
            options.time += entry.shift
            comment.p = commentOptionsToString(options)
          }

          comments.push(comment)
        })
      }
    } catch (e: unknown) {
      console.error(e)
    }
  }

  return comments
}

export const getExtComments = async (url: string): Promise<CommentEntity[]> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/extcomment`,
    params: {
      url,
    },
    schema: danDanCommentResponseSchema,
  })

  return data.comments
}

export const getRelated = async (
  episodeId: number
): Promise<DanDanRelatedItem[]> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/related/${episodeId.toString()}`,
    schema: danDanRelatedSchema,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.relateds
}

export const getBangumiAnime = async (
  animeId: number
): Promise<DanDanBangumiAnimeResult> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/bangumi/${animeId}`,
    schema: danDanBangumiAnimeResponseSchema,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.bangumi satisfies DanDanBangumiAnimeResult
}
