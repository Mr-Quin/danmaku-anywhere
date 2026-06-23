import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpException } from '../../exceptions/HttpException'
import { ResponseParseException } from '../../exceptions/ResponseParseException'
import {
  createTestUniChunk,
  mockFetch,
  mockFetchResponse,
} from '../utils/testUtils'

import {
  getBangumiInfo,
  getCurrentUser,
  getDanmakuProto,
  getDanmakuProtoSegment,
  getDanmakuXml,
  searchMedia,
} from './api'
import { BiliBiliApiException } from './exceptions'
import {
  mockBilibiliBangmumiSearchResponse,
  mockBilibiliBangumiInfoResponse,
  mockBilibiliMediaSearchResponse,
  mockBilibiliUserLoggedInResponse,
  mockBilibiliUserNotLoggedInResponse,
  mockDanmakuXml,
} from './test/mockData'

describe('Bilibili', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('user', () => {
    it('should parse info of logged in user', async () => {
      mockFetchResponse(mockBilibiliUserLoggedInResponse)

      const result = await getCurrentUser()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isLogin).toEqual(true)
      }
    })

    it('should parse info of not logged in user', async () => {
      mockFetchResponse(mockBilibiliUserNotLoggedInResponse)

      const result = await getCurrentUser()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isLogin).toEqual(false)
      }
    })
  })

  describe('search', () => {
    it('should return success on search bangumi', async () => {
      mockFetchResponse(mockBilibiliBangmumiSearchResponse)

      const result = await searchMedia({ keyword: 'MyGo' })
      expect(result.success).toBe(true)
    })

    it('should return success on search media', async () => {
      mockFetchResponse(mockBilibiliMediaSearchResponse)

      const result = await searchMedia({ keyword: 'MyGo' })
      expect(result.success).toBe(true)
    })

    it('should return error on API error (logical)', async () => {
      const mockResponse = {
        code: -412,
        message: 'Error',
      }

      mockFetchResponse(mockResponse)

      const result = await searchMedia({ keyword: 'MyGo' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(BiliBiliApiException)
      }
    })

    it('should return HttpException on 500 error with body', async () => {
      const errorBody = '<html>Server Error</html>'

      mockFetch(
        new Response(errorBody, {
          status: 500,
        })
      )

      const result = await searchMedia({ keyword: 'MyGo' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const e = result.error
        expect(e).toBeInstanceOf(HttpException)
        expect((e as HttpException).status).toBe(500)
        expect((e as HttpException).url).toContain('api.bilibili.com')
        expect((e as HttpException).responseBody).toBe(errorBody)
      }
    })

    it('should return ResponseParseException on malformed JSON', async () => {
      mockFetch(new Response(JSON.stringify({ code: 0 })))

      const result = await searchMedia({ keyword: 'malformed json' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const e = result.error
        expect(e).toBeInstanceOf(ResponseParseException)
        expect((e as ResponseParseException).responseBody).toEqual({ code: 0 })
        expect((e as ResponseParseException).url).toContain('api.bilibili.com')
      }
    })
  })

  describe('getBangumiInfo', () => {
    it('should return success on valid response', async () => {
      mockFetchResponse(mockBilibiliBangumiInfoResponse)

      const result = await getBangumiInfo({ seasonId: 1 })
      expect(result.success).toBe(true)
    })

    it('should return error on API error', async () => {
      const mockResponse = {
        code: -412,
        message: 'Error',
      }

      mockFetchResponse(mockResponse)

      const result = await getBangumiInfo({ seasonId: 1 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(BiliBiliApiException)
      }
    })
  })

  describe('get danmaku xml', () => {
    it('should parse and return danmaku in UniChunk', async () => {
      mockFetchResponse(mockDanmakuXml)

      const uchunk = await createTestUniChunk()
      const result = await getDanmakuXml(uchunk, 1)

      expect(result.success).toBe(true)
      if (result.success) {
        const danmakus = await result.data.$danmakus
        expect(danmakus).toHaveLength(17)
        expect(danmakus[0]).toHaveProperty('content')
        expect(danmakus[0]).toHaveProperty('progress')
      }
    })

    it('should return error if response is not xml', async () => {
      mockFetch(new Response('not xml'))

      const uchunk = await createTestUniChunk()
      const result = await getDanmakuXml(uchunk, 1)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ResponseParseException)
      }
    })
  })

  describe('get danmaku protobuf', () => {
    it('should stop fetching if response is 304', async () => {
      const mockProtoResponse = await readFile(
        resolve(__dirname, './test/danmakuProto.dm')
      )

      mockFetchResponse(mockProtoResponse)

      const uchunk = await createTestUniChunk()
      const generator = getDanmakuProtoSegment(uchunk, 1)

      const firstResult = await generator.next()
      expect(firstResult.value.success).toBe(true)
      if (firstResult.value.success) {
        const count1 = await firstResult.value.data.$count
        expect(count1).toBe(937)
      }

      const secondResult = await generator.next()
      expect(secondResult.value.success).toBe(true)
      if (secondResult.value.success) {
        const count2 = await secondResult.value.data.$count
        expect(count2).toBe(937 * 2)
      }

      mockFetchResponse(mockProtoResponse, 304)

      const thirdResult = await generator.next()
      expect(thirdResult.done).toBe(true)
    })

    it('should fetch multiple segments', async () => {
      const mockProtoResponse = await readFile(
        resolve(__dirname, './test/danmakuProto.dm')
      )

      let calledTimes = 0
      vi.spyOn(global, 'fetch').mockImplementation(() => {
        if (calledTimes > 2) {
          return {
            status: 304,
          } as any
        }

        calledTimes++
        return {
          arrayBuffer: vi.fn().mockResolvedValue(mockProtoResponse),
          status: 200,
        } as any
      })

      const uchunk = await createTestUniChunk()
      const result = await getDanmakuProto(uchunk, 1)
      expect(result.success).toBe(true)
      if (result.success) {
        const count = await result.data.$count
        expect(count).toBe(937 * 3)
      }
    })

    it('should return error when data is invalid', async () => {
      mockFetchResponse(new TextEncoder().encode('invalid').buffer)

      const uchunk = await createTestUniChunk()
      const result = await getDanmakuProto(uchunk, 1)
      expect(result.success).toBe(false)
    })
  })
})
