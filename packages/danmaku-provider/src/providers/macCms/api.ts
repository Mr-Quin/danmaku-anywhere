import { ok, type Result } from '@danmaku-anywhere/result'
import type { ZodType, z } from 'zod'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { fetchData } from '../utils/fetchData.js'
import { zDanmuIcuDanmaku } from './danmuIcu.js'
import { type GenericVodSearchResponse, zVodSearchResponse } from './schema.js'

const withQuery = (
  baseUrl: string,
  path: string,
  query?: Record<string, unknown>
) => {
  const url = new URL(path, baseUrl)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v))
      }
    })
  }
  return url.toString()
}

const fetchJson = async <T extends ZodType>(url: string, responseSchema: T) => {
  return fetchData({ url, responseSchema })
}

export const searchMacCmsVod = async (
  baseUrl: string,
  keyword: string
): Promise<Result<GenericVodSearchResponse, DanmakuProviderError>> => {
  const url = withQuery(baseUrl, '/api.php/provide/vod/', {
    ac: 'detail',
    wd: keyword,
  })
  return fetchJson(url, zVodSearchResponse)
}

export const fetchDanmuIcuComments = async (
  baseUrl: string,
  videoUrl: string,
  stripColor: boolean
): Promise<Result<z.infer<typeof zDanmuIcuDanmaku>, DanmakuProviderError>> => {
  const url = withQuery(baseUrl, '/', {
    ac: 'dm',
    url: videoUrl,
  })
  const commentsResult = await fetchJson(url, zDanmuIcuDanmaku)

  if (!commentsResult.success) {
    return commentsResult
  }

  const comments = commentsResult.data

  if (stripColor) {
    // set color to white if stripColor is true
    return ok(
      comments.map((c) => {
        const [time, mode] = c.p.split(',')
        return {
          ...c,
          p: [time, mode, '16777215'].join(','),
        }
      })
    )
  }
  return ok(comments)
}
