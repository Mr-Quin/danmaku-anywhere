import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { err, ok, type Result } from '@danmaku-anywhere/result'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { HttpException } from '../../exceptions/HttpException.js'
import { ResponseParseException } from '../../exceptions/ResponseParseException.js'
import { createThrottle } from '../utils/createThrottle.js'
import {
  handleParseResponse,
  handleParseResponseAsync,
} from '../utils/index.js'
import { TencentApiException } from './exceptions.js'

import type {
  TencentCommentSegmentData,
  TencentEpisodeListItem,
  TencentEpisodeListParams,
  TencentSearchParams,
  TencentVideoSeason,
} from './schema.js'
import {
  zTencentComment,
  zTencentCommentSegment,
  zTencentEpisodeListResponse,
  zTencentPageDetailResponse,
  zTencentSearchResponse,
} from './schema.js'
import { ensureData, parseHeader } from './utils.js'

const TENCENT_API_URL_ROOT = 'https://pbaccess.video.qq.com'
const DM_API_URL_ROOT = 'https://dm.video.qq.com'

const throttle = createThrottle(100)

const searchMediaDefaultParams = {
  version: '',
  filterValue: 'firstTabid=150',
  retry: 0,
  query: '',
  pagesize: 20,
  pagenum: 0,
  queryFrom: 4,
  isneedQc: true,
  adRequestInfo: '',
  sdkRequestInfo: '',
  sceneId: 21,
  platform: '23',
} satisfies TencentSearchParams

export const searchMedia = async (
  params: TencentSearchParams
): Promise<Result<TencentVideoSeason[], DanmakuProviderError>> => {
  await throttle()

  const newParams = { ...searchMediaDefaultParams, ...params }

  const url = `${TENCENT_API_URL_ROOT}/trpc.videosearch.mobile_search.HttpMobileRecall/MbSearchHttp`

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(newParams),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.status >= 400) {
      const { errorMsg } = parseHeader(response)
      const message = errorMsg || response.statusText
      return err(
        new HttpException(
          `Request failed with status ${response.status}: ${response.statusText} ${message}`,
          response.status,
          response.statusText,
          url,
          message
        )
      )
    }

    const data = await response.json()

    const parseResult = handleParseResponse(
      () => zTencentSearchResponse.parse(data),
      {
        url,
        responseBody: data,
      }
    )

    if (!parseResult.success) return parseResult

    try {
      ensureData(parseResult.data, 'data', response)
      return ok(parseResult.data.data.normalList.itemList)
    } catch (e: unknown) {
      if (
        e instanceof ResponseParseException ||
        e instanceof TencentApiException
      )
        return err(e)
      return err(
        new ResponseParseException({
          cause: e,
          url,
          responseBody: data,
        })
      )
    }
  } catch (e) {
    if (e instanceof ResponseParseException) return err(e) // Should be caught by Result check ideally, but handleParseResponse returns Result
    // If json() fails or network error
    return err(
      new HttpException(
        e instanceof Error ? e.message : String(e),
        0,
        'Network Error',
        url
      )
    )
  }
}

export const getPageDetails = async (
  cid: string,
  vid?: string
): Promise<Result<any, DanmakuProviderError>> => {
  const url = `${TENCENT_API_URL_ROOT}/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vversion_name=8.2.96&vversion_platform=2`

  const requestBody = {
    has_cache: 1,
    pageParams: {
      cid,
      lid: '0',
      vid: vid || '',
      req_from: 'web_mobile',
      page_type: 'detail_operation',
      page_id: 'detail_page_introduction',
    },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.status >= 400) {
      const { errorMsg } = parseHeader(response)
      const message = errorMsg || response.statusText
      return err(
        new HttpException(
          message,
          response.status,
          response.statusText,
          url,
          message
        )
      )
    }

    const data = await response.json()

    const parseResult = handleParseResponse(
      () => zTencentPageDetailResponse.parse(data),
      {
        url,
        responseBody: data,
      }
    )

    if (!parseResult.success) return parseResult

    try {
      ensureData(parseResult.data, 'data', response)
      return ok(parseResult.data.data)
    } catch (e: unknown) {
      if (
        e instanceof ResponseParseException ||
        e instanceof TencentApiException
      )
        return err(e)
      return err(
        new ResponseParseException({
          cause: e,
          url,
          responseBody: data,
        })
      )
    }
  } catch (e) {
    return err(
      new HttpException(
        e instanceof Error ? e.message : String(e),
        0,
        'Network Error',
        url
      )
    )
  }
}

const listEpisodeDefaultParams = {
  cid: '',
  lid: 0,
  vid: '',
  req_from: 'web_mobile',
  page_type: 'detail_operation',
  page_id: 'vsite_episode_list',
  id_type: 1,
  page_size: 100,
  page_context: '',
} satisfies TencentEpisodeListParams

export async function* listEpisodes(
  params: TencentEpisodeListParams
): AsyncGenerator<Result<TencentEpisodeListItem[], DanmakuProviderError>> {
  const MAX_ITERATIONS = 100

  const appliedParams = {
    ...listEpisodeDefaultParams,
    ...params,
  }

  const url = `${TENCENT_API_URL_ROOT}/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vversion_name=8.2.96&vversion_platform=2`

  const pageSize = appliedParams.page_size
  let i = 0
  let lastId = ''

  const getPageContext = () => {
    return `episode_begin=${i * pageSize + 1}&episode_end=${(i + 1) * pageSize}&episode_step=${pageSize}`
  }

  while (true) {
    await throttle()

    const pageParams = {
      ...appliedParams,
      page_context: getPageContext(),
    }

    // convert all fields to string
    const requestBody = {
      has_cache: 1,
      pageParams: Object.fromEntries(
        Object.entries(pageParams).map(([key, value]) => [key, String(value)])
      ),
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status >= 400) {
        const { errorMsg } = parseHeader(response)
        const message = errorMsg || response.statusText
        yield err(
          new HttpException(
            message,
            response.status,
            response.statusText,
            url,
            message
          )
        )
        return
      }

      const data = await response.json()

      const parseResult = handleParseResponse(
        () => zTencentEpisodeListResponse.parse(data),
        {
          url,
          responseBody: data,
        }
      )

      if (!parseResult.success) {
        yield parseResult
        return
      }

      try {
        ensureData(parseResult.data, 'data', response)
      } catch (e: unknown) {
        if (
          e instanceof ResponseParseException ||
          e instanceof TencentApiException
        ) {
          yield err(e)
          return
        }
        yield err(
          new ResponseParseException({
            cause: e,
            url,
            responseBody: data,
          })
        )
        return
      }

      // check if data is empty, probably only happens on the first page
      if (
        parseResult.data.data.module_list_datas.length === 0 ||
        parseResult.data.data.module_list_datas[0].module_datas.length === 0
      ) {
        return null
      }

      const episodes =
        parseResult.data.data.module_list_datas[0].module_datas[0].item_data_lists.item_datas.map(
          (item) => item.item_params
        )

      // we are in a loop, break out
      if (episodes.at(-1)?.vid === lastId) {
        return null
      }

      yield ok(episodes)

      // not enough episodes to fill a page, so there is no next page
      if (episodes.length < pageSize) {
        return null
      }

      lastId = episodes.at(-1)?.vid ?? ''
      i += 1
      if (i >= MAX_ITERATIONS) {
        return null
      }
    } catch (e) {
      yield err(
        new HttpException(
          e instanceof Error ? e.message : String(e),
          0,
          'Network Error',
          url
        )
      )
      return
    }
  }
}

export const getDanmakuSegments = async (
  vid: string
): Promise<Result<TencentCommentSegmentData, DanmakuProviderError>> => {
  await throttle()

  const url = `${DM_API_URL_ROOT}/barrage/base/${vid}`

  try {
    const response = await fetch(url)
    if (response.status >= 400) {
      return err(
        new HttpException(
          response.statusText,
          response.status,
          response.statusText,
          url
        )
      )
    }

    const json = await response.json()

    const parseResult = await handleParseResponseAsync(
      () => zTencentCommentSegment.parseAsync(json),
      {
        url,
        responseBody: json,
      }
    )

    if (!parseResult.success) return parseResult
    return ok(parseResult.data)
  } catch (e) {
    return err(
      new HttpException(
        e instanceof Error ? e.message : String(e),
        0,
        'Network Error',
        url
      )
    )
  }
}

export async function* getDanmakuGenerator(
  vid: string,
  segmentData: TencentCommentSegmentData
): AsyncGenerator<Result<CommentEntity[], DanmakuProviderError>> {
  const segments = Object.values(segmentData.segment_index)

  if (segmentData.segment_span === 0) return

  for (const segment of segments) {
    await throttle()

    const url = `${DM_API_URL_ROOT}/barrage/segment/${vid}/${segment.segment_name}`

    try {
      const response = await fetch(url)
      if (response.status >= 400) {
        yield err(
          new HttpException(
            response.statusText,
            response.status,
            response.statusText,
            url
          )
        )
        return
      }

      const json = await response.json()

      const result = await handleParseResponseAsync(
        () => zTencentComment.parseAsync(json),
        {
          url,
          responseBody: json,
        }
      )

      if (!result.success) {
        yield result
      } else {
        yield ok(result.data.barrage_list)
      }
    } catch (e) {
      yield err(
        new HttpException(
          e instanceof Error ? e.message : String(e),
          0,
          'Network Error',
          url
        )
      )
      return
    }
  }
}

export const getDanmaku = async (
  vid: string
): Promise<Result<CommentEntity[], DanmakuProviderError>> => {
  const segmentDataResult = await getDanmakuSegments(vid)

  if (!segmentDataResult.success) return segmentDataResult

  const generator = getDanmakuGenerator(vid, segmentDataResult.data)

  const comments: CommentEntity[] = []

  for await (const segmentResult of generator) {
    if (!segmentResult.success) return segmentResult
    comments.push(...segmentResult.data)
  }

  return ok(comments)
}
