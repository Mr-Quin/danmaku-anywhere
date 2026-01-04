import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { mockFetchResponse } from '../utils/testUtils'
import {
  commentGetComment,
  getBangumiAnime,
  searchSearchAnime,
  searchSearchEpisodes,
} from './api'
import { DanDanPlayApiException } from './exceptions'

describe('DanDanPlay API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('searchSearchEpisodes', () => {
    it('should return error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
        animes: [],
        hasMore: false,
      }

      mockFetchResponse(mockResponse)

      const result = await searchSearchEpisodes({ anime: 'test' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DanDanPlayApiException)
      }
    })

    it('should return error on unexpected data', async () => {
      mockFetchResponse({})

      const result = await searchSearchEpisodes({ anime: 'test' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ResponseParseException)
      }
    })
  })

  describe('searchSearchAnime', () => {
    it('should return error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
      }

      mockFetchResponse(mockResponse)

      const result = await searchSearchAnime('MyGo')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DanDanPlayApiException)
      }
    })

    it('should return error on unexpected data', async () => {
      mockFetchResponse({})

      const result = await searchSearchAnime('MyGo')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ResponseParseException)
      }
    })
  })

  describe('commentGetComment', () => {
    it('should return error on unexpected data', async () => {
      mockFetchResponse({})

      const result = await commentGetComment(1)
      expect(result.success).toBe(false)
      if (!result.success) {
        // Since commentGetComment doesn't throw DDP exception (it just returns comments),
        // but if parsing fails, it returns ResponseParseException.
        expect(result.error).toBeInstanceOf(ResponseParseException)
      }
    })
  })

  describe('getBangumiAnime', () => {
    it('should return error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
      }

      mockFetchResponse(mockResponse)

      const result = await getBangumiAnime('1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DanDanPlayApiException)
      }
    })

    it('should return error on unexpected data', async () => {
      mockFetchResponse({})

      const result = await getBangumiAnime('1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ResponseParseException)
      }
    })
  })

  it('should call the right url', async () => {
    const mockResponse = {
      errorCode: 0,
      errorMessage: '',
      success: true,
      animes: [],
      hasMore: false,
    }

    const mockFetch = mockFetchResponse(mockResponse)

    await searchSearchEpisodes({ anime: 'test' })

    expect(mockFetch.mock.calls[0][0]).toEqual(
      'https://api.danmaku.weeblify.app/ddp/v1?path=%2Fv2%2Fsearch%2Fepisodes%3Fanime%3Dtest'
    )
  })

  it('should use the configured API root', async () => {
    const mockResponse = {
      errorCode: 0,
      errorMessage: '',
      success: true,
      animes: [],
      hasMore: false,
    }

    const mockFetch = mockFetchResponse(mockResponse)

    const baseUrl = 'https://example.com'

    await searchSearchEpisodes({ anime: 'test' }, { baseUrl, isCustom: true })

    expect(mockFetch.mock.calls[0][0]).toEqual(
      `${baseUrl}/v2/search/episodes?anime=test`
    )
  })
})
