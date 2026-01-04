import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { mockFetchResponse } from '../utils/testUtils'

import * as tencentApi from './api'
import { TencentApiException } from './exceptions'
import * as mockData from './test/mockData'

describe('Tencent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('search', () => {
    it('should return success on search', async () => {
      mockFetchResponse(mockData.mockSearchMediaResponse)

      const result = await tencentApi.searchMedia({ query: '斗罗大陆' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(9)
      }
    })

    it('should return error on API error', async () => {
      const mockResponse = {
        ret: 400,
        msg: 'server err',
      }

      mockFetchResponse(mockResponse)

      const result = await tencentApi.searchMedia({ query: '斗罗大陆' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(TencentApiException)
      }
    })

    it('should return error on response parse error', async () => {
      mockFetchResponse({})

      const result = await tencentApi.searchMedia({ query: '斗罗大陆' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ResponseParseException)
      }
    })
  })

  describe('listEpisodes', () => {
    it('should get episode list', async () => {
      const generator = tencentApi.listEpisodes({ cid: 'm441e3rjq9kwpsc' })
      const mockFetch = mockFetchResponse(mockData.mockEpisodeListResponse)

      const firstResult = await generator.next()
      expect(firstResult.value.success).toBe(true)
      if (firstResult.value.success) {
        expect(firstResult.value.data).toHaveLength(100)
      }

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // the payload should have stringified params
      expect(mockFetch.mock.calls[0][1]).toEqual({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          has_cache: 1,
          pageParams: {
            cid: 'm441e3rjq9kwpsc',
            lid: '0',
            vid: '',
            req_from: 'web_mobile',
            page_type: 'detail_operation',
            page_id: 'vsite_episode_list',
            id_type: '1',
            page_size: '100',
            page_context: 'episode_begin=1&episode_end=100&episode_step=100',
          },
        }),
      })

      mockFetchResponse(mockData.mockEpisodeListLastResponse)

      // Wait, listEpisodes returns generator of Promises of Result?
      // Or AsyncGenerator yielding results?
      // tencent/api.ts: async function* listEpisodes(...) yields Result

      const secondResult = await generator.next()
      if (!secondResult.done) {
        // It should be done if mockEpisodeListLastResponse indicates end?
        // Check mock logic, but usually we just check done or value
        // If second yield is expected
        // Let's assume the test logic was correct about 2 yields or 2nd is done?
        // Original test: const second = await generator.next(); expect(second.done).toBe(true)

        // Assuming second call returns done based on mock data
        expect(secondResult.done).toBe(true)
      } else {
        expect(secondResult.done).toBe(true)
      }
    })

    it('should return error on API error', async () => {
      const mockResponse = {
        ret: 400,
        msg: 'server err',
      }

      mockFetchResponse(mockResponse)

      const generator = tencentApi.listEpisodes({ cid: 'm441e3rjq9kwpsc' })
      const firstResult = await generator.next()

      expect(firstResult.value.success).toBe(false)
      if (!firstResult.value.success) {
        expect(firstResult.value.error).toBeInstanceOf(TencentApiException)
      }
    })

    it('should return error on unexpected data', async () => {
      mockFetchResponse({})

      const generator = tencentApi.listEpisodes({ cid: 'm441e3rjq9kwpsc' })
      const firstResult = await generator.next()

      expect(firstResult.value.success).toBe(false)
      if (!firstResult.value.success) {
        expect(firstResult.value.error).toBeInstanceOf(ResponseParseException)
      }
    })
  })

  describe('get danmaku', () => {
    it('should get segments', async () => {
      mockFetchResponse(mockData.mockBarrageBaseResponse)

      const result = await tencentApi.getDanmakuSegments('m00253deqqo')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveProperty('segment_index')
      }
    })

    it('should fetch comments using segments', async () => {
      const mockFetch = mockFetchResponse(mockData.mockBarrageBaseResponse)

      const segmentsResult = await tencentApi.getDanmakuSegments('m00253deqqo')
      if (!segmentsResult.success) throw segmentsResult.error
      const segmentData = segmentsResult.data

      const totalSegments = Object.values(segmentData.segment_index).length

      mockFetch.mockReset()
      mockFetch.mockImplementation(() => {
        return {
          json: vi.fn().mockResolvedValue(mockData.mockBarrage600000Response),
          status: 200,
        } as any
      })

      const generator = tencentApi.getDanmakuGenerator(
        'm00253deqqo',
        segmentData
      )

      for await (const commentsResult of generator) {
        expect(commentsResult.success).toBe(true)
        if (commentsResult.success) {
          expect(commentsResult.data).toHaveLength(
            mockData.mockBarrage600000Response.barrage_list.length
          )
        }
      }

      expect(fetch).toHaveBeenCalledTimes(totalSegments)
      // should call all segments
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://dm.video.qq.com/barrage/segment/m00253deqqo/t/v1/0/30000'
      )
      expect(fetch).toHaveBeenLastCalledWith(
        'https://dm.video.qq.com/barrage/segment/m00253deqqo/t/v1/300000/330000'
      )
    })

    it('should return error when data is invalid', async () => {
      mockFetchResponse(mockData.mockBarrageBaseResponse)
      const segmentsResult = await tencentApi.getDanmakuSegments('m00253deqqo')
      if (!segmentsResult.success) throw segmentsResult.error
      const segmentData = segmentsResult.data

      mockFetchResponse(new TextEncoder().encode('invalid').buffer)

      const generator = tencentApi.getDanmakuGenerator(
        'm00253deqqo',
        segmentData
      )

      const firstResult = await generator.next()
      expect(firstResult.value.success).toBe(false)
    })
  })
})
