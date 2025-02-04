import {
  commentOptionsToString,
  parseCommentEntityP,
} from '@danmaku-anywhere/danmaku-converter'
import type { ZodSchema } from 'zod'

import { HttpException } from '../../exceptions/HttpException.js'
import { handleParseResponse } from '../utils/index.js'

import { DanDanPlayApiException } from './exceptions.js'
import type {
  SearchEpisodesQuery,
  SearchEpisodesAnime,
  BangumiDetails,
  GetCommentQuery,
  SearchAnimeDetails,
  RelatedItemV2,
  RegisterRequestV2,
  LoginResponse,
  LoginRequest,
  SendCommentRequest,
  CommentData,
  GetExtCommentQuery,
  ResetPasswordRequestV2,
  FindMyIdRequestV2,
} from './schema.js'
import {
  zResponseBase,
  zResetPasswordRequestV2,
  zFindMyIdRequestV2,
  zSendCommentResponseV2,
  zSendCommentRequest,
  zLoginRequest,
  zRegisterRequestV2,
  zGetCommentQuery,
  zRelatedResponseV2,
  zSearchAnimeResponse,
  zSearchEpisodesResponse,
  zBangumiDetailsResponse,
  zLoginResponse,
  zCommentResponseV2,
} from './schema.js'

export const API_ROOT = 'https://api.dandanplay.net'

const store = {
  baseUrl: API_ROOT,
  token: '',
}

export const configure = (options: Partial<typeof store>) => {
  Object.assign(store, options)
}

interface DanDanPlayInit<T = unknown> {
  path: string
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  requestSchema?: {
    body?: ZodSchema
    query?: ZodSchema
  }
  responseSchema: ZodSchema<T>
  method?: 'GET' | 'POST'
}

const validateRequest = ({ requestSchema, body, query }: DanDanPlayInit) => {
  if (requestSchema?.body) {
    requestSchema.body.parse(body)
  }
  if (requestSchema?.query) {
    requestSchema.query.parse(query)
  }
}

const createUrl = ({ path, query }: DanDanPlayInit) => {
  const { baseUrl } = store

  if (!query) {
    return `${baseUrl}${path}`
  }

  return `${baseUrl}${path}?${new URLSearchParams(query as never)}`
}

const getHeaders = async ({ body }: DanDanPlayInit) => {
  const headers = {}

  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  if (store.token) {
    headers['Authorization'] = `Bearer ${store.token}`
  }

  return headers
}

const fetchDanDanPlay = async <T extends object>(init: DanDanPlayInit<T>) => {
  const { responseSchema, method = 'GET', body } = init

  validateRequest(init)
  const url = createUrl(init)

  const headers = await getHeaders(init)

  const res = await fetch(url, {
    headers: {
      ...headers,
    },
    method,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status >= 400) {
    const errorMessage =
      res.headers.get('X-Error-Message') ?? (await res.text())

    throw new HttpException(
      `Request failed with status ${res.status}: ${res.statusText}
      ${errorMessage}`,
      res.status,
      res.statusText
    )
  }

  const json: unknown = await res.json()

  const data = handleParseResponse(() => responseSchema.parse(json))

  return data
}

export const searchSearchAnime = async (
  keyword: string
): Promise<SearchAnimeDetails[]> => {
  const data = await fetchDanDanPlay({
    path: '/api/v2/search/anime',
    query: {
      keyword,
    },
    responseSchema: zSearchAnimeResponse,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes
}

export const searchSearchEpisodes = async ({
  anime,
  episode = '',
}: SearchEpisodesQuery): Promise<SearchEpisodesAnime[]> => {
  const data = await fetchDanDanPlay({
    path: '/api/v2/search/episodes',
    query: {
      anime,
      episode,
    },
    responseSchema: zSearchEpisodesResponse,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes
}

export const commentGetComment = async (
  episodeId: number,
  query: GetCommentQuery = {}
): Promise<CommentData[]> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/comment/${episodeId.toString()}`,
    query,
    responseSchema: zCommentResponseV2,
    requestSchema: { query: zGetCommentQuery },
  })

  return data.comments
}

export const commentSendComment = async (request: SendCommentRequest) => {
  const data = await fetchDanDanPlay({
    path: '/api/v2/search/episodes',
    body: request,
    responseSchema: zSendCommentResponseV2,
    requestSchema: {
      body: zSendCommentRequest,
    },
    method: 'POST',
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}

export const commentGetExtComment = async (
  query: GetExtCommentQuery
): Promise<CommentData[]> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/extcomment`,
    query,
    responseSchema: zCommentResponseV2,
  })

  return data.comments
}

export const commentGetCommentManualWithRelated = async (
  episodeId: number,
  params: Partial<GetCommentQuery> = {}
): Promise<CommentData[]> => {
  const comments = await commentGetComment(episodeId, {
    ...params,
    withRelated: false, // disable this flag to fetch related comments manually
  })

  if (params.withRelated) {
    try {
      const relatedData = await relatedGetRelated(episodeId)

      for (const entry of relatedData) {
        const additionalComments = await commentGetExtComment({
          url: entry.url,
        })

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

export const relatedGetRelated = async (
  episodeId: number
): Promise<RelatedItemV2[]> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/related/${episodeId.toString()}`,
    responseSchema: zRelatedResponseV2,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.relateds
}

export const getBangumiAnime = async (
  animeId: number
): Promise<BangumiDetails> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/bangumi/${animeId.toString()}`,
    responseSchema: zBangumiDetailsResponse,
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.bangumi
}

export const registerRegisterMainUser = async (
  request: RegisterRequestV2
): Promise<LoginResponse> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/register`,
    responseSchema: zLoginResponse,
    requestSchema: {
      body: zRegisterRequestV2,
    },
    body: request,
    method: 'POST',
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}

export const registerResetPassword = async (
  request: ResetPasswordRequestV2
): Promise<null> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/register/resetpassword`,
    responseSchema: zResponseBase,
    requestSchema: {
      body: zResetPasswordRequestV2,
    },
    body: request,
    method: 'POST',
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return null
}

export const registerFindMyId = async (
  request: FindMyIdRequestV2
): Promise<null> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/register/findmyid`,
    responseSchema: zResponseBase,
    requestSchema: {
      body: zFindMyIdRequestV2,
    },
    body: request,
    method: 'POST',
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return null
}

export const loginLogin = async (
  request: LoginRequest
): Promise<LoginResponse> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/login`,
    responseSchema: zLoginResponse,
    requestSchema: {
      body: zLoginRequest,
    },
    body: request,
    method: 'POST',
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}

export const loginRenewToken = async (): Promise<LoginResponse> => {
  const data = await fetchDanDanPlay({
    path: `/api/v2/login`,
    responseSchema: zLoginResponse,
    method: 'GET',
  })

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}
