import {
  commentOptionsToString,
  parseCommentEntityP,
} from '@danmaku-anywhere/danmaku-converter'
import type { ZodType } from 'zod'
import { getApiStore } from '../../shared/store.js'
import type { FetchOptions } from '../utils/fetchData.js'
import { fetchData } from '../utils/fetchData.js'
import { DanDanPlayApiException } from './exceptions.js'

import type {
  BangumiDetails,
  CommentData,
  FindMyIdRequestV2,
  GetCommentQuery,
  GetExtCommentQuery,
  LoginRequest,
  LoginResponse,
  RegisterRequestV2,
  RelatedItemV2,
  ResetPasswordRequestV2,
  SearchAnimeDetails,
  SearchEpisodesAnime,
  SearchEpisodesQuery,
  SendCommentRequest,
} from './schema.js'
import {
  zBangumiDetailsResponse,
  zCommentResponseV2,
  zFindMyIdRequestV2,
  zGetCommentQuery,
  zLoginRequest,
  zLoginResponse,
  zRegisterRequestV2,
  zRelatedResponseV2,
  zResetPasswordRequestV2,
  zResponseBase,
  zSearchAnimeResponse,
  zSearchEpisodeQuery,
  zSearchEpisodesResponse,
  zSendCommentRequest,
  zSendCommentResponseV2,
} from './schema.js'

export interface DanDanPlayQueryContext {
  // fallback to default if not provided
  baseUrl?: string
  isCustom?: boolean
  auth?: {
    token?: string
    headers?: Array<{
      key: string
      value: string
    }>
  }
}

const fetchDanDanPlay = async <T extends ZodType>(
  options: Omit<FetchOptions<T>, 'url' | 'headers'> & { path: string },
  context?: DanDanPlayQueryContext
) => {
  const headers: Record<string, string> = {}

  const store = getApiStore()

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  // add custom headers from context
  if (context?.auth?.headers) {
    for (const header of context.auth.headers) {
      headers[header.key] = header.value
    }
  }

  // parse query early
  if (options.requestSchema?.query) {
    options.query = options.requestSchema.query.parse(options.query)
    options.requestSchema.query = undefined
  }
  // append query to path
  let path = options.path
  if (options.query) {
    path += `?${new URLSearchParams(options.query as Record<string, string>).toString()}`
  }

  // use the custom baseUrl if isCustom is true
  if (context?.isCustom) {
    if (!context.baseUrl) {
      throw new Error('Custom baseUrl is required when isCustom is true')
    }
    return fetchData<T>({
      url: `${context.baseUrl}${options.path}`, // use unmodified path
      ...options,
      headers,
    })
  }

  // otherwise use the default proxy
  return fetchData<T>({
    url: `${store.baseUrl}/ddp/v1`,
    ...options,
    query: {
      path,
    },
    headers,
  })
}

export const searchSearchAnime = async (
  keyword: string,
  context?: DanDanPlayQueryContext
): Promise<SearchAnimeDetails[]> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/search/anime',
      query: {
        keyword,
      },
      responseSchema: zSearchAnimeResponse,
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes
}

export const searchSearchEpisodes = async (
  query: SearchEpisodesQuery,
  context?: DanDanPlayQueryContext
): Promise<SearchEpisodesAnime[]> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/search/episodes',
      query,
      responseSchema: zSearchEpisodesResponse,
      requestSchema: {
        query: zSearchEpisodeQuery,
      },
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.animes
}

export const commentGetComment = async (
  episodeId: number,
  query: GetCommentQuery = {},
  context?: DanDanPlayQueryContext
): Promise<CommentData[]> => {
  const data = await fetchDanDanPlay(
    {
      path: `/v2/comment/${episodeId.toString()}`,
      query,
      responseSchema: zCommentResponseV2,
      requestSchema: { query: zGetCommentQuery },
    },
    context
  )

  return data.comments
}

export const commentSendComment = async (
  request: SendCommentRequest,
  context?: DanDanPlayQueryContext
) => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/search/episodes',
      body: request,
      responseSchema: zSendCommentResponseV2,
      requestSchema: {
        body: zSendCommentRequest,
      },
      method: 'POST',
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}

export const commentGetExtComment = async (
  query: GetExtCommentQuery,
  context?: DanDanPlayQueryContext
): Promise<CommentData[]> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/extcomment',
      query,
      responseSchema: zCommentResponseV2,
    },
    context
  )

  return data.comments
}

export const commentGetCommentManualWithRelated = async (
  episodeId: number,
  params: GetCommentQuery = {},
  context?: DanDanPlayQueryContext
): Promise<CommentData[]> => {
  const comments = await commentGetComment(
    episodeId,
    {
      ...params,
      withRelated: false, // disable this flag to fetch related comments manually
    },
    context
  )

  if (params.withRelated) {
    try {
      const relatedData = await relatedGetRelated(episodeId, context)

      for (const entry of relatedData) {
        const additionalComments = await commentGetExtComment(
          {
            url: entry.url,
          },
          context
        )

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
  episodeId: number,
  context?: DanDanPlayQueryContext
): Promise<RelatedItemV2[]> => {
  const data = await fetchDanDanPlay(
    {
      path: `/v2/related/${episodeId.toString()}`,
      responseSchema: zRelatedResponseV2,
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.relateds
}

export const getBangumiAnime = async (
  bangumiId: string,
  context?: DanDanPlayQueryContext
): Promise<BangumiDetails> => {
  const data = await fetchDanDanPlay(
    {
      path: `/v2/bangumi/${bangumiId}`,
      responseSchema: zBangumiDetailsResponse,
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data.bangumi
}

export const registerRegisterMainUser = async (
  request: RegisterRequestV2,
  context?: DanDanPlayQueryContext
): Promise<LoginResponse> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/register',
      responseSchema: zLoginResponse,
      requestSchema: {
        body: zRegisterRequestV2,
      },
      body: request,
      method: 'POST',
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}

export const registerResetPassword = async (
  request: ResetPasswordRequestV2,
  context?: DanDanPlayQueryContext
): Promise<null> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/register/resetpassword',
      responseSchema: zResponseBase,
      requestSchema: {
        body: zResetPasswordRequestV2,
      },
      body: request,
      method: 'POST',
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return null
}

export const registerFindMyId = async (
  request: FindMyIdRequestV2,
  context?: DanDanPlayQueryContext
): Promise<null> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/register/findmyid',
      responseSchema: zResponseBase,
      requestSchema: {
        body: zFindMyIdRequestV2,
      },
      body: request,
      method: 'POST',
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return null
}

export const loginLogin = async (
  request: LoginRequest,
  context?: DanDanPlayQueryContext
): Promise<LoginResponse> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/login',
      responseSchema: zLoginResponse,
      requestSchema: {
        body: zLoginRequest,
      },
      body: request,
      method: 'POST',
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}

export const loginRenewToken = async (
  context?: DanDanPlayQueryContext
): Promise<LoginResponse> => {
  const data = await fetchDanDanPlay(
    {
      path: '/v2/login',
      responseSchema: zLoginResponse,
      method: 'GET',
    },
    context
  )

  if (!data.success) {
    throw new DanDanPlayApiException(data.errorMessage, data.errorCode)
  }

  return data
}
