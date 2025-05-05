import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'

import { createThrottle } from '../utils/createThrottle.js'
import {
  handleParseResponse,
  handleParseResponseAsync,
} from '../utils/index.js'

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
import { ensureData } from './utils.js'

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
): Promise<TencentVideoSeason[]> => {
  await throttle()

  params = { ...searchMediaDefaultParams, ...params }

  const url = `${TENCENT_API_URL_ROOT}/trpc.videosearch.mobile_search.HttpMobileRecall/MbSearchHttp`

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    zTencentSearchResponse.parse(data)
  )

  ensureData(parsedData, 'data', response)

  return parsedData.data.normalList.itemList satisfies TencentVideoSeason[]
}

export const getPageDetails = async (cid: string, vid?: string) => {
  const url = `${TENCENT_API_URL_ROOT}/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2`

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

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    zTencentPageDetailResponse.parse(data)
  )

  ensureData(parsedData, 'data', response)

  return parsedData.data
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

export async function* listEpisodes(params: TencentEpisodeListParams) {
  const MAX_ITERATIONS = 100

  const appliedParams = {
    ...listEpisodeDefaultParams,
    ...params,
  }

  const url = `${TENCENT_API_URL_ROOT}/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2`

  const pageSize = appliedParams.page_size
  let i = 0,
    lastId = ''

  const getPageContext = () => {
    return `episode_begin=${i * pageSize + 1}&episode_end=${(i + 1) * pageSize}&episode_step=${pageSize}`
  }

  while (1) {
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

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    const parsedData = handleParseResponse(() =>
      zTencentEpisodeListResponse.parse(data)
    )

    ensureData(parsedData, 'data', response)

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

    // we are in a loop, break out
    if (episodes.at(-1)?.vid === lastId) {
      return null
    }

    yield episodes satisfies TencentEpisodeListItem[]

    // not enough episodes to fill a page, so there is no next page
    if (episodes.length < pageSize) {
      return null
    }

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
    zTencentCommentSegment.parseAsync(json)
  )

  return segments
}

export async function* getDanmakuGenerator(
  vid: string,
  segmentData: TencentCommentSegmentData
): AsyncGenerator<CommentEntity[]> {
  const segments = Object.values(segmentData.segment_index)

  if (segmentData.segment_span === 0) return []

  for (const segment of segments) {
    await throttle()

    const url = `${DM_API_URL_ROOT}/barrage/segment/${vid}/${segment.segment_name}`

    const response = await fetch(url)

    const json = await response.json()

    const comments = await handleParseResponseAsync(() =>
      zTencentComment.parseAsync(json)
    )

    yield comments.barrage_list
  }
}

export const getDanmaku = async (vid: string) => {
  const segmentData = await getDanmakuSegments(vid)

  const generator = getDanmakuGenerator(vid, segmentData)

  const comments: CommentEntity[] = []

  for await (const segmentComments of generator) {
    comments.push(...segmentComments)
  }

  return comments
}
