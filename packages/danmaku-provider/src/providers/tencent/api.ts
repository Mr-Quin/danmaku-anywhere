import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

import { createThrottle } from '../utils/createThrottle.js'
import {
  handleParseResponse,
  handleParseResponseAsync,
} from '../utils/index.js'

import type {
  TencentCommentSegmentData,
  TencentEpisodeListItem,
  TencentSearchParams,
  TencentSearchResult,
} from './schema.js'
import {
  tencentCommentSchema,
  tencentEpisodeListResponseSchema,
  tencentSearchResponseSchema,
  tencentCommentSegmentSchema,
} from './schema.js'
import { ensureData } from './utils.js'

const TENCENT_API_URL_ROOT = 'https://pbaccess.video.qq.com'
const DM_API_URL_ROOT = 'https://dm.video.qq.com'

const throttle = createThrottle(100)

export const setCookies = async () => {
  await fetch('https://v.qq.com/')
}

const searchMediaDefaultParams: TencentSearchParams = {
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
}

export const searchMedia = async (params: TencentSearchParams) => {
  await throttle()

  params = { ...searchMediaDefaultParams, ...params }

  const url = `${TENCENT_API_URL_ROOT}/trpc.videosearch.mobile_search.HttpMobileRecall/MbSearchHttp`

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(params),
  })

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    tencentSearchResponseSchema.parse(data)
  )

  // api returns error message in the header
  const errorMsg = response.headers.get('Trpc-Error-Msg') || undefined

  ensureData(parsedData, 'data', errorMsg)

  return parsedData.data.result satisfies TencentSearchResult
}

// numbers need to be string
const listEpisodeDefaultParams = {
  pageParams: {
    cid: '',
    lid: '0',
    req_from: 'web_mobile',
    page_type: 'detail_operation',
    page_id: 'vsite_episode_list',
    id_type: '1',
    page_size: '100',
    page_context: '',
  },
  has_cache: 1,
}

export async function* listEpisodes(cid: string) {
  const MAX_ITERATIONS = 100

  const url = `${TENCENT_API_URL_ROOT}/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2`

  const pageSize = 100
  let i = 0,
    start = 1,
    end = pageSize,
    pageContext = '',
    lastId = ''

  while (1) {
    await throttle()

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ...listEpisodeDefaultParams,
        pageParams: {
          ...listEpisodeDefaultParams.pageParams,
          cid,
          pageContext,
        },
      }),
    })

    const data = await response.json()

    const parsedData = handleParseResponse(() =>
      tencentEpisodeListResponseSchema.parse(data)
    )

    const errorMsg = response.headers.get('Trpc-Error-Msg') || undefined

    ensureData(parsedData, 'data', errorMsg)

    // check if data is empty, probably only happens on the first page
    if (
      parsedData.data.module_list_datas.length === 0 ||
      parsedData.data.module_list_datas[0].module_datas.length === 0
    ) {
      return null
    }

    const episodes =
      parsedData.data.module_list_datas[0].module_datas[0].item_data_lists.item_datas.map(
        (item) => item.item_params
      )

    // break out of potential infinite loop
    if (episodes.at(-1)?.vid === lastId) {
      return null
    }

    yield episodes satisfies TencentEpisodeListItem[]

    // not enough episodes to fill a page, so there is no next page
    if (episodes.length < pageSize) {
      return null
    }

    pageContext = `episode_begin=${start}&episode_end=${end}&episode_step=${pageSize}`
    start += pageSize
    end += pageSize
    lastId = episodes.at(-1)!.vid

    i += 1
    if (i >= MAX_ITERATIONS) {
      return null
    }
  }
}

export const getDanmakuSegments = async (
  vid: string
): Promise<TencentCommentSegmentData> => {
  await throttle()

  const url = `${DM_API_URL_ROOT}/barrage/base/${vid}`

  const response = await fetch(url)

  const json = await response.json()

  const segments = await handleParseResponseAsync(() =>
    tencentCommentSegmentSchema.parseAsync(json)
  )

  return segments
}

export async function* getDanmakuBySegments(
  vid: string,
  segmentData: TencentCommentSegmentData
): AsyncGenerator<CommentEntity[]> {
  const segments = Object.values(segmentData.segment_index)

  if (segmentData.segment_span === 0) return []

  for (const segment of segments) {
    await throttle()

    const url = `${DM_API_URL_ROOT}/barrage/base/${vid}/${segment.segment_name}`

    const response = await fetch(url)

    const json = await response.json()

    const comments = await handleParseResponseAsync(() =>
      tencentCommentSchema.parseAsync(json)
    )

    yield comments.barrage_list
  }
}
