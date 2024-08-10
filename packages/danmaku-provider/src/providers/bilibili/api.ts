import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { bilibiliCommentSchemaXml } from '@danmaku-anywhere/danmaku-converter'

import {
  handleParseResponse,
  handleParseResponseAsync,
} from '../utils/index.js'

import type { BiliBiliSearchParams, BiliBiliSearchType } from './schema.js'
import {
  bilibiliBangumiInfoResponseSchema,
  bilibiliSearchResponseSchema,
} from './schema.js'
import { ensureData } from './utils.js'

const BILIBILI_API_URL_ROOT = 'https://api.bilibili.com'

const search = async (
  params: BiliBiliSearchParams,
  type: BiliBiliSearchType
) => {
  const keyword = encodeURIComponent(params.keyword)

  const url = `${BILIBILI_API_URL_ROOT}/x/web-interface/search/type?keyword=${keyword}&search_type=${type}`

  const response = await fetch(url)

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    bilibiliSearchResponseSchema.parse(data)
  )

  ensureData(parsedData, 'data')

  return parsedData.data
}

// search for media by keyword
export const searchMedia = async (params: BiliBiliSearchParams) => {
  const mediaResult = await Promise.all([
    search(params, 'media_ft'),
    search(params, 'media_bangumi'),
  ])

  return mediaResult
    .map((result) => {
      return result.result
    })
    .flat()
}

// using season id, get a list of episodes
export const getBangumiInfo = async (seasonId: number) => {
  const url = `${BILIBILI_API_URL_ROOT}/pgc/view/web/season?season_id=${seasonId}`

  const response = await fetch(url)

  const data = await response.json()

  const parsedData = handleParseResponse(() =>
    bilibiliBangumiInfoResponseSchema.parse(data)
  )

  ensureData(parsedData, 'result')

  return parsedData.result
}

export const getDanmakuXml = async (cid: number): Promise<CommentEntity[]> => {
  const url = `${BILIBILI_API_URL_ROOT}/x/v1/dm/list.so?oid=${cid}`

  const response = await fetch(url)

  const xmlData = await response.text()

  const comments = await handleParseResponseAsync(() =>
    bilibiliCommentSchemaXml.parseAsync(xmlData)
  )

  return comments.comments
}

export const getDanmakuProto = async () => {
  throw new Error('Not implemented')
}
