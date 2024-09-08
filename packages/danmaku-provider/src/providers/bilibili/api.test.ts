import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, it, expect, beforeEach, vi } from 'vitest'

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
  mockBilibiliBangumiInfoResponse,
  mockBilibiliBangmumiSearchResponse,
  mockDanmakuXml,
  mockBilibiliMediaSearchResponse,
  mockBilibiliUserLoggedInResponse,
  mockBilibiliUserNotLoggedInResponse,
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

    it('should throw an error on API error', async () => {
      const mockResponse = {
        code: -412,
        message: 'Error',
      }

      mockFetchResponse(mockResponse)

      await expect(searchMedia({ keyword: 'MyGo' })).rejects.toThrow(
        BiliBiliApiException
      )
    })

    it('should throw an error on response parse error', async () => {
      mockFetchResponse({})

      await expect(searchMedia({ keyword: 'MyGo' })).rejects.toThrow(
        ResponseParseException
      )
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

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(getBangumiInfo({ seasonId: 1 })).rejects.toThrow(
        ResponseParseException
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

      expect(promise).rejects.toThrow()
    })
  })
})
