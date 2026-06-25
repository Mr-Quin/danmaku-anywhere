import { BiliGrpcAdapter, BiliXmlAdapter } from '@dan-uni/dan-any/adapters'
import type { UniChunk } from '@dan-uni/dan-any/core'
import { err, ok, type Result } from '@danmaku-anywhere/result'
import { z } from 'zod'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { HttpException } from '../../exceptions/HttpException.js'
import { InputError } from '../../exceptions/InputError.js'
import { ResponseParseException } from '../../exceptions/ResponseParseException.js'
import { createThrottle } from '../utils/createThrottle.js'
import { fetchData } from '../utils/fetchData.js'
import type {
  BiliBiliSearchParams,
  BiliBiliSearchType,
  BilibiliBangumiInfo,
  BilibiliMedia,
  BilibiliUserInfo,
} from './schema.js'
import {
  zBilibiliBangumiInfoResponse,
  zBilibiliSearchResponse,
  zBilibiliUserInfo,
} from './schema.js'
import { ensureSelectData } from './utils.js'

const BILIBILI_API_URL_ROOT = 'https://api.bilibili.com'

const throttle = createThrottle(200)

// Visit bilibili.com to set cookies
export const setCookies = async () => {
  await fetch('http://bilibili.com')
}

export const getCurrentUser = async (): Promise<
  Result<BilibiliUserInfo, DanmakuProviderError>
> => {
  await throttle()

  const result = await fetchData({
    url: `${BILIBILI_API_URL_ROOT}/x/web-interface/nav`,
    responseSchema: zBilibiliUserInfo,
  })

  if (!result.success) return result

  return ok(result.data.data)
}

const search = async (
  params: BiliBiliSearchParams,
  type: BiliBiliSearchType
): Promise<Result<BilibiliMedia[], DanmakuProviderError>> => {
  await throttle()

  const url = `${BILIBILI_API_URL_ROOT}/x/web-interface/search/type`

  const result = await fetchData({
    url,
    query: {
      keyword: params.keyword,
      search_type: type,
    },
    responseSchema: zBilibiliSearchResponse,
  })

  if (!result.success) return result

  return ensureSelectData(result.data, 'data', (data) => data.result)
}

// search for media by keyword
export const searchMedia = async (
  params: BiliBiliSearchParams
): Promise<Result<BilibiliMedia[], DanmakuProviderError>> => {
  await throttle()

  // We need to handle multiple promises returning Result
  const [ftResult, bangumiResult] = await Promise.all([
    search(params, 'media_ft'),
    search(params, 'media_bangumi'),
  ])

  if (!ftResult.success) return ftResult
  if (!bangumiResult.success) return bangumiResult

  return ok([...ftResult.data, ...bangumiResult.data])
}

// using season id, get a list of episodes
export const getBangumiInfo = async ({
  seasonId,
  episodeId,
}: {
  seasonId?: number
  episodeId?: number
}): Promise<Result<BilibiliBangumiInfo, DanmakuProviderError>> => {
  await throttle()

  if (!seasonId && !episodeId) {
    return err(new InputError('Either seasonId or episodeId must be provided'))
  }

  const url = `${BILIBILI_API_URL_ROOT}/pgc/view/web/season`
  const query = seasonId ? { season_id: seasonId } : { ep_id: episodeId }

  const result = await fetchData({
    url,
    query,
    responseSchema: zBilibiliBangumiInfoResponse,
  })

  if (!result.success) return result

  return ensureSelectData(result.data, 'result', (data) => data)
}

export const getDanmakuXml = async (
  uchunk: UniChunk,
  cid: number
): Promise<Result<UniChunk, DanmakuProviderError>> => {
  await throttle()

  const url = `${BILIBILI_API_URL_ROOT}/x/v1/dm/list.so?oid=${cid}`

  const response = await fetchData({
    url,
    responseType: 'text',
    responseSchema: z
      .string()
      .transform(async (xml) => await uchunk.import(BiliXmlAdapter(xml))),
  })

  if (!response.success) return response

  return response
}

export async function* getDanmakuProtoSegment(
  uchunk: UniChunk,
  oid: number,
  pid?: number
): AsyncGenerator<Result<UniChunk, DanmakuProviderError>> {
  const MAX_SEGMENT = 100

  let segmentIndex = 1

  const params = new URLSearchParams({
    type: '1',
    oid: oid.toString(),
    segment_index: segmentIndex.toString(),
  })

  if (pid) {
    params.set('pid', pid.toString())
  }

  while (true) {
    await throttle()

    params.set('segment_index', segmentIndex.toString())

    const url = `${BILIBILI_API_URL_ROOT}/x/v2/dm/web/seg.so?${params}`

    try {
      const response = await fetch(url)

      if (response.status === 304) {
        return null
      }

      if (response.status >= 400) {
        yield err(
          new HttpException(
            'Bilibili API Error',
            response.status,
            response.statusText,
            url,
            await response.text()
          )
        )
        return
      }

      const buffer = await response.arrayBuffer()

      try {
        await uchunk.import(BiliGrpcAdapter(buffer))
        yield ok(uchunk)
      } catch (e) {
        yield err(
          new ResponseParseException({
            message: 'Failed to decode protobuf',
            cause: e,
            url,
            responseBody: 'protobuf',
          })
        )
        return
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

    segmentIndex++

    if (segmentIndex > MAX_SEGMENT) {
      return null
    }
  }
}

export const getDanmakuProto = async (
  uchunk: UniChunk,
  oid: number,
  pid?: number
): Promise<Result<UniChunk, DanmakuProviderError>> => {
  const segments = getDanmakuProtoSegment(uchunk, oid, pid)

  for await (const result of segments) {
    if (!result.success) {
      return result
    }
  }

  return ok(uchunk)
}
