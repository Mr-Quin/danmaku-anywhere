import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpException } from '../../exceptions/HttpException'
import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { mockFetchResponse } from '../utils/testUtils'

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

      const res = await getCurrentUser()

      expect(res.isLogin).toEqual(true)
    })

    it('should parse info of not logged in user', async () => {
      mockFetchResponse(mockBilibiliUserNotLoggedInResponse)

      const res = await getCurrentUser()

      expect(res.isLogin).toEqual(false)
    })
  })

  describe('search', () => {
    it('should not throw on search bangumi', async () => {
      mockFetchResponse(mockBilibiliBangmumiSearchResponse)

      await expect(searchMedia({ keyword: 'MyGo' })).resolves.not.toThrow()
    })

    it('should not throw on search media', async () => {
      mockFetchResponse(mockBilibiliMediaSearchResponse)

      await expect(searchMedia({ keyword: 'MyGo' })).resolves.not.toThrow()
    })

    it('should throw an error on API error (logical)', async () => {
      const mockResponse = {
        code: -412,
        message: 'Error',
      }

      mockFetchResponse(mockResponse)

      await expect(searchMedia({ keyword: 'MyGo' })).rejects.toThrow(
        BiliBiliApiException
      )
    })

    it('should throw HttpException on 500 error with body', async () => {
      const errorBody = '<html>Server Error</html>'
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => errorBody,
        headers: new Headers(),
        json: async () => ({}),
      } as Response)

      try {
        await searchMedia({ keyword: 'MyGo' })
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException)
        expect((e as HttpException).responseBody).toBe(errorBody)
        expect((e as HttpException).status).toBe(500)
        expect((e as HttpException).url).toContain('api.bilibili.com')
      }
    })

    it('should throw ResponseParseException on malformed JSON', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          // missing data field
        }),
      } as Response)

      try {
        await searchMedia({ keyword: 'MyGo' })
      } catch (e) {
        expect(e).toBeInstanceOf(ResponseParseException)
        expect((e as ResponseParseException).responseBody).toEqual({ code: 0 })
        expect((e as ResponseParseException).url).toContain('api.bilibili.com')
      }
    })
  })

  describe('getBangumiInfo', () => {
    it('should not throw on valid response', async () => {
      mockFetchResponse(mockBilibiliBangumiInfoResponse)

      await expect(getBangumiInfo({ seasonId: 1 })).resolves.not.toThrow()
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        code: -412,
        message: 'Error',
      }

      mockFetchResponse(mockResponse)

      await expect(getBangumiInfo({ seasonId: 1 })).rejects.toThrow(
        BiliBiliApiException
      )
    })
  })

  describe('get danmaku xml', () => {
    it('should parse and return danmaku xml', async () => {
      mockFetchResponse(mockDanmakuXml)

      const data = await getDanmakuXml(1)

      expect(data).toHaveLength(17)
      expect(data).toContainEqual({
        m: '分多少----、',
        p: '3771.649,1,16777215',
      })
    })

    it('should throw if response is not xml', async () => {
      mockFetchResponse('not xml')

      await expect(getDanmakuXml(1)).rejects.toThrow(ResponseParseException)
    })
  })

  describe('get danmaku protobuf', () => {
    it('should stop fetching if response is 304', async () => {
      const mockProtoResponse = await readFile(
        resolve(__dirname, './test/danmakuProto.dm')
      )

      mockFetchResponse(mockProtoResponse)

      const generator = getDanmakuProtoSegment(1)

      const first = await generator.next()

      expect(first.value).toHaveLength(937)

      const second = await generator.next()

      expect(second.value).toHaveLength(937)

      mockFetchResponse(mockProtoResponse, 304)

      const third = await generator.next()

      expect(third.done).toBe(true)
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

      const promise = getDanmakuProto(1)

      const comments = await promise
      expect(comments).toHaveLength(937 * 3)
    })

    it('should throw when data is invalid', async () => {
      mockFetchResponse(new TextEncoder().encode('invalid').buffer)

      const promise = getDanmakuProto(1)

      await expect(promise).rejects.toThrow()
    })
  })
})
