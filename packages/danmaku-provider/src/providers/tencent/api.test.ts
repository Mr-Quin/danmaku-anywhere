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
        tencentApi.searchMedia({ query: 'MyGo' })
      ).resolves.not.toThrow()
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        ret: 400,
        msg: 'server err',
      }

      mockFetchResponse(mockResponse)
      await expect(tencentApi.searchMedia({ query: 'MyGo' })).rejects.toThrow(
        TencentException
      )
    })

    it('should throw an error on response parse error', async () => {
      mockFetchResponse({})

      await expect(tencentApi.searchMedia({ query: 'MyGo' })).rejects.toThrow(
        ResponseParseException
      )
    })
  })

  describe('listEpisodes', () => {
    it('should not throw on valid response', async () => {
      const generator = tencentApi.listEpisodes('m441e3rjq9kwpsc')
      mockFetchResponse(mockData.mockEpisodeListResponse)
      const first = await generator.next()
      expect(first.value).toHaveLength(100)

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
        tencentApi.listEpisodes('m441e3rjq9kwpsc').next()
      ).rejects.toThrow(TencentException)
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(
        tencentApi.listEpisodes('m441e3rjq9kwpsc').next()
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

      let calledTimes = 0
      vi.spyOn(global, 'fetch').mockImplementation(() => {
        calledTimes++
        return {
          json: vi.fn().mockResolvedValue(mockData.mockBarrage600000Response),
          status: 200,
        } as any
      })

      const generator = tencentApi.getDanmakuBySegments(
        'm00253deqqo',
        segmentData
      )

      for await (const comments of generator) {
        expect(comments).toHaveLength(
          mockData.mockBarrage600000Response.barrage_list.length
        )
      }

      expect(calledTimes).toEqual(totalSegments)
    })

    it('should throw when data is invalid', async () => {
      mockFetchResponse(mockData.mockBarrageBaseResponse)
      const segmentData = await tencentApi.getDanmakuSegments('m00253deqqo')

      mockFetchResponse(new TextEncoder().encode('invalid').buffer)

      const generator = tencentApi.getDanmakuBySegments(
        'm00253deqqo',
        segmentData
      )

      expect(generator.next()).rejects.toThrow()
    })
  })
})
