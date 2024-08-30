import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { bilibiliCommentSchemaXml } from '@danmaku-anywhere/danmaku-converter'

import { bilibili as bilibiliProto } from '../../protobuf/protobuf.js'
import { createThrottle } from '../utils/createThrottle.js'
import {
  handleParseResponse,
  handleParseResponseAsync,
} from '../utils/index.js'

import type {
  BilibiliBangumiInfo,
  BiliBiliSearchParams,
  BilibiliSearchResult,
  BiliBiliSearchType,
} from './schema.js'
import {
  bilibiliUserInfoSchema,
  bilibiliBangumiInfoResponseSchema,
  bilibiliSearchResponseSchema,
  bilibiliCommentSchemaProto,
} from './schema.js'
import { ensureData } from './utils.js'

const BILIBILI_API_URL_ROOT = 'https://api.bilibili.com'

const throttle = createThrottle(200)

// Visit bilibili.com to set cookies
export const setCookies = async () => {
  await fetch('http://bilibili.com')
}

export const getCurrentUser = async () => {
  await throttle()

  const url = `${BILIBILI_API_URL_ROOT}/x/web-interface/nav`

  const response = await fetch(url)

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    bilibiliUserInfoSchema.parse(data)
  )

  // data property is always present, even if the user is not logged in

  return parsedData.data
}

const search = async (
  params: BiliBiliSearchParams,
  type: BiliBiliSearchType
) => {
  await throttle()

  const keyword = encodeURIComponent(params.keyword)

  const url = `${BILIBILI_API_URL_ROOT}/x/web-interface/search/type?keyword=${keyword}&search_type=${type}`

  const response = await fetch(url)

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    bilibiliSearchResponseSchema.parse(data)
  )

  ensureData(parsedData, 'data')

  return parsedData.data.result satisfies BilibiliSearchResult
}

// search for media by keyword
export const searchMedia = async (params: BiliBiliSearchParams) => {
  await throttle()

  const mediaResult = await Promise.all([
    search(params, 'media_ft'),
    search(params, 'media_bangumi'),
  ])

  return mediaResult
    .map((result) => {
      return result
    })
    .flat()
}

// using season id, get a list of episodes
export const getBangumiInfo = async (seasonId: number) => {
  await throttle()

  const url = `${BILIBILI_API_URL_ROOT}/pgc/view/web/season?season_id=${seasonId}`

  const response = await fetch(url)

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    bilibiliBangumiInfoResponseSchema.parse(data)
  )

  ensureData(parsedData, 'result')

  return parsedData.result satisfies BilibiliBangumiInfo
}

export const getDanmakuXml = async (cid: number): Promise<CommentEntity[]> => {
  await throttle()

  const url = `${BILIBILI_API_URL_ROOT}/x/v1/dm/list.so?oid=${cid}`

  const response = await fetch(url)

  const xmlData = await response.text()

  const comments = await handleParseResponseAsync(() =>
    bilibiliCommentSchemaXml.parseAsync(xmlData)
  )

  return comments.comments
}

export async function* getDanmakuProtoSegment(
  oid: number,
  pid?: number
): AsyncGenerator<CommentEntity[]> {
  const MAX_SEGMENT = 100 // arbitrary number

  let segmentIndex = 1

  const params = new URLSearchParams({
    type: '1', // 1 for video, 2 for comics
    oid: oid.toString(),
    segment_index: segmentIndex.toString(),
  })

  if (pid) {
    params.set('pid', pid.toString())
  }

  while (1) {
    await throttle()

    params.set('segment_index', segmentIndex.toString())

    const url = `${BILIBILI_API_URL_ROOT}/x/v2/dm/web/seg.so?${params}`

    const response = await fetch(url)

    if (response.status === 304) {
      return null
    }

    const buffer = await response.arrayBuffer()

    let parsed: bilibiliProto.community.service.dm.v1.IDmSegMobileReply

    try {
      parsed = bilibiliProto.community.service.dm.v1.DmSegMobileReply.decode(
        new Uint8Array(buffer)
      )
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.message)
      } else {
        console.error(e)
      }
      throw new Error('Failed to decode protobuf', { cause: e })
    }

    const comments = await handleParseResponseAsync(() =>
      bilibiliCommentSchemaProto.parseAsync(parsed)
    )

    yield comments.elems

    segmentIndex++

    if (segmentIndex > MAX_SEGMENT) {
      return null
    }
  }
}

// Evenly pick a sample from an array up to a limit
const sample = <T>(arr: T[], limit: number): T[] => {
  if (arr.length <= limit) return arr

  const sample: T[] = []
  const step = Math.ceil(arr.length / limit)

  for (let i = 0; i < arr.length; i += step) {
    sample.push(arr[i])
  }

  return sample
}

// oid = cid, pid = avids
export const getDanmakuProto = async (
  oid: number,
  pid?: number,
  { limitPerMinute = 1000 }: { limitPerMinute?: number } = {}
): Promise<CommentEntity[]> => {
  const segments = getDanmakuProtoSegment(oid, pid)
  const comments: CommentEntity[][] = []

  for await (const segment of segments) {
    comments.push(sample(segment, limitPerMinute * 6)) // each segment is 6 minutes
  }

  return comments.flat()
}
