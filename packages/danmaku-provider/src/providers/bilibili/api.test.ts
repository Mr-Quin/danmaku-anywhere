import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { mockFetchResponse } from '../utils/testUtils'

import {
  getBangumiInfo,
  getDanmakuProto,
  getDanmakuProtoSegment,
  getDanmakuXml,
  searchMedia,
} from './api'
import { BiliBiliException } from './BiliBiliException'
import {
  mockBilibiliBangumiInfoResponse,
  mockBilibiliBangmumiSearchResponse,
  mockDanmakuXml,
  mockBilibiliMediaSearchResponse,
} from './mockData/mockData'

describe('Bilibili', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('search', () => {
    it('should not throw on search bangumi', async () => {
      mockFetchResponse(mockBilibiliBangmumiSearchResponse)

      // not mocking fetch here to test the actual fetch
      await expect(searchMedia({ keyword: 'MyGo' })).resolves.not.toThrow()
    })

    it('should not throw on search media', async () => {
      mockFetchResponse(mockBilibiliMediaSearchResponse)

      // not mocking fetch here to test the actual fetch
      await expect(searchMedia({ keyword: 'MyGo' })).resolves.not.toThrow()
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        code: -412,
        message: 'Error',
      }

      mockFetchResponse(mockResponse)

      await expect(searchMedia({ keyword: 'MyGo' })).rejects.toThrow(
        BiliBiliException
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

      // not mocking fetch here to test the actual fetch
      await expect(getBangumiInfo(1)).resolves.not.toThrow()
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        code: -412,
        message: 'Error',
      }

      mockFetchResponse(mockResponse)

      await expect(getBangumiInfo(1)).rejects.toThrow(BiliBiliException)
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(getBangumiInfo(1)).rejects.toThrow(ResponseParseException)
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
        resolve(__dirname, './mockData/danmakuProto.dm')
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

    it('should throw when data is invalid', async () => {
      mockFetchResponse(new TextEncoder().encode('invalid').buffer)

      const data = await getDanmakuProto(1)

      expect(data).toHaveLength(937)
      expect(data).toContainEqual({
        m: '海参三叉戟',
        p: '344.433,1,16777215',
      })
    })
  })
})
