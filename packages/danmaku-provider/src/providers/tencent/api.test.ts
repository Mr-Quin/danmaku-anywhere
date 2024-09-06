import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { mockFetchResponse } from '../utils/testUtils'

import * as tencentApi from './api'
import { TencentException } from './TencentException'
import * as mockData from './test/mockData'

describe('Tencent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('search', () => {
    it('should not throw on search', async () => {
      mockFetchResponse(mockData.mockSearchMediaResponse)

      await expect(
        tencentApi.searchMedia({ query: '斗罗大陆' })
      ).resolves.not.toThrow()

      const result = await tencentApi.searchMedia({ query: '斗罗大陆' })

      expect(result).toHaveLength(9)
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        ret: 400,
        msg: 'server err',
      }

      mockFetchResponse(mockResponse)
      await expect(
        tencentApi.searchMedia({ query: '斗罗大陆' })
      ).rejects.toThrow(TencentException)
    })

    it('should throw an error on response parse error', async () => {
      mockFetchResponse({})

      await expect(
        tencentApi.searchMedia({ query: '斗罗大陆' })
      ).rejects.toThrow(ResponseParseException)
    })
  })

  describe('listEpisodes', () => {
    it('should get episode list', async () => {
      const generator = tencentApi.listEpisodes({ cid: 'm441e3rjq9kwpsc' })
      const mockFetch = mockFetchResponse(mockData.mockEpisodeListResponse)
      const first = await generator.next()
      expect(first.value).toHaveLength(100)
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
      const second = await generator.next()
      expect(second.done).toBe(true)
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        ret: 400,
        msg: 'server err',
      }

      mockFetchResponse(mockResponse)

      await expect(
        tencentApi.listEpisodes({ cid: 'm441e3rjq9kwpsc' }).next()
      ).rejects.toThrow(TencentException)
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(
        tencentApi.listEpisodes({ cid: 'm441e3rjq9kwpsc' }).next()
      ).rejects.toThrow(ResponseParseException)
    })
  })

  describe('get danmaku', () => {
    it('should get segments', async () => {
      mockFetchResponse(mockData.mockBarrageBaseResponse)

      const segmentData = await tencentApi.getDanmakuSegments('m00253deqqo')

      expect(segmentData).toHaveProperty('segment_index')
    })

    it('should fetch comments using segments', async () => {
      mockFetchResponse(mockData.mockBarrageBaseResponse)
      const segmentData = await tencentApi.getDanmakuSegments('m00253deqqo')
      const totalSegments = Object.values(segmentData.segment_index).length

      vi.spyOn(global, 'fetch').mockImplementation(() => {
        return {
          json: vi.fn().mockResolvedValue(mockData.mockBarrage600000Response),
          status: 200,
        } as any
      })

      const generator = tencentApi.getDanmakuGenerator(
        'm00253deqqo',
        segmentData
      )

      for await (const comments of generator) {
        expect(comments).toHaveLength(
          mockData.mockBarrage600000Response.barrage_list.length
        )
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

    it('should throw when data is invalid', async () => {
      mockFetchResponse(mockData.mockBarrageBaseResponse)
      const segmentData = await tencentApi.getDanmakuSegments('m00253deqqo')

      mockFetchResponse(new TextEncoder().encode('invalid').buffer)

      const generator = tencentApi.getDanmakuGenerator(
        'm00253deqqo',
        segmentData
      )

      expect(generator.next()).rejects.toThrow()
    })
  })
})
