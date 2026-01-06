import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { ok, type Result } from '@danmaku-anywhere/result'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { createThrottle } from '../utils/createThrottle.js'
import { fetchData } from '../utils/fetchData.js'

import type {
  TencentCommentSegmentData,
  TencentEpisodeListItem,
  TencentEpisodeListParams,
  TencentPageDetailResponse,
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
import { ensureData, parseHeader, validateTencentResponse } from './utils.js'

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

  const result = await fetchData({
    url,
    method: 'POST',
    body: newParams,
    headers: { 'Content-Type': 'application/json' },
    responseSchema: zTencentSearchResponse,
    getErrorMessage: async (res) => parseHeader(res).errorMsg,
    responseValidator: validateTencentResponse,
  })

  if (!result.success) return result

  const dataResult = ensureData(result.data, 'data')
  if (!dataResult.success) return dataResult

  return ok(dataResult.data.normalList.itemList)
}

export const getPageDetails = async (
  cid: string,
  vid?: string
): Promise<Result<TencentPageDetailResponse['data'], DanmakuProviderError>> => {
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

  const result = await fetchData({
    url,
    method: 'POST',
    body: requestBody,
    headers: { 'Content-Type': 'application/json' },
    responseSchema: zTencentPageDetailResponse,
    getErrorMessage: async (res) => parseHeader(res).errorMsg,
    responseValidator: validateTencentResponse,
  })

  if (!result.success) return result

  const dataResult = ensureData(result.data, 'data')
  if (!dataResult.success) return dataResult

  return ok(dataResult.data)
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

    const result = await fetchData({
      url,
      method: 'POST',
      body: requestBody,
      headers: { 'Content-Type': 'application/json' }, // Should be headers?
      responseSchema: zTencentEpisodeListResponse,
      getErrorMessage: async (res) => parseHeader(res).errorMsg,
      responseValidator: validateTencentResponse,
    })

    if (!result.success) {
      yield result
      return
    }

    const dataResult = ensureData(result.data, 'data')
    if (!dataResult.success) {
      yield dataResult
      return
    }

    // check if data is empty, probably only happens on the first page
    if (
      dataResult.data.module_list_datas.length === 0 ||
      dataResult.data.module_list_datas[0].module_datas.length === 0
    ) {
      return null
    }

    const episodes =
      dataResult.data.module_list_datas[0].module_datas[0].item_data_lists.item_datas.map(
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
  }
}

export const getDanmakuSegments = async (
  vid: string
): Promise<Result<TencentCommentSegmentData, DanmakuProviderError>> => {
  await throttle()

  const url = `${DM_API_URL_ROOT}/barrage/base/${vid}`

  return fetchData({
    url,
    responseSchema: zTencentCommentSegment,
  })
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

    const result = await fetchData({
      url,
      responseSchema: zTencentComment,
    })

    if (!result.success) {
      yield result
    } else {
      yield ok(result.data.barrage_list)
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
