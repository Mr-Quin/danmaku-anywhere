import {
  commentOptionsToString,
  parseCommentEntityP,
} from '@danmaku-anywhere/danmaku-converter'

import type { FetchOptions } from '../utils/fetchData.js'
import { fetchData } from '../utils/fetchData.js'

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
  zSearchEpisodeQuery,
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

// Reimplement fetchDanDanPlay using fetchData
const fetchDanDanPlay = async <T extends object>(
  options: Omit<FetchOptions<T>, 'url' | 'headers'> & { path: string }
) => {
  const headers: Record<string, string> = {}

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  if (store.token) {
    headers['Authorization'] = `Bearer ${store.token}`
  }

  return fetchData<T>({
    url: `${store.baseUrl}${options.path}`,
    ...options,
    headers,
  })
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

export const searchSearchEpisodes = async (
  query: SearchEpisodesQuery
): Promise<SearchEpisodesAnime[]> => {
  const data = await fetchDanDanPlay({
    path: '/api/v2/search/episodes',
    query,
    responseSchema: zSearchEpisodesResponse,
    requestSchema: {
      query: zSearchEpisodeQuery,
    },
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
  params: GetCommentQuery = {}
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
