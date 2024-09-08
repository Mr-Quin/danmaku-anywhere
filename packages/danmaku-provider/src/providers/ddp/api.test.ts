import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { mockFetchResponse } from '../utils/testUtils'

import { searchAnime, fetchComments, getBangumiAnime, configure } from './api'
import { DanDanPlayApiException } from './exceptions'
import { mockAnimeSearchResponse, mockCommentResponse } from './mockData'

describe('DandanPlay API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('searchAnime', () => {
    it('should not throw on fetch', async () => {
      mockFetchResponse(mockAnimeSearchResponse)

      await expect(searchAnime({ anime: 'MyGo' })).resolves.not.toThrow()
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
        animes: [],
        hasMore: false,
      }

      mockFetchResponse(mockResponse)

      await expect(searchAnime({ anime: 'test' })).rejects.toThrow(
        DanDanPlayApiException
      )
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(searchAnime({ anime: 'test' })).rejects.toThrow(
        ResponseParseException
      )
    })
  })

  describe('fetchComments', () => {
    it('should parse fetched comments', async () => {
      mockFetchResponse(mockCommentResponse)

      const data = await fetchComments(1)
      expect(data).toHaveLength(116)
      expect(data).toContainEqual({
        cid: 1723310127,
        p: '112.48,1,16777215,[5dm]游客',
        m: '听到纯的第一反应是樱田纯',
      })
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(fetchComments(1)).rejects.toThrow(ResponseParseException)
    })
  })

  describe('getBangumiAnime', () => {
    it.skip('should not throw on fetch', async () => {
      const animeId = 17981 // MyGo anime id
      await expect(getBangumiAnime(animeId)).resolves.not.toThrow()
    })

    it('should throw an error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
      }

      mockFetchResponse(mockResponse)

      await expect(getBangumiAnime(1)).rejects.toThrow(DanDanPlayApiException)
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(getBangumiAnime(1)).rejects.toThrow(ResponseParseException)
    })
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

    const customRoot = 'https://example.com'
    configure({ baseUrl: customRoot })

    await searchAnime({ anime: 'test' })

    expect(mockFetch).toHaveBeenCalledWith(
      `${customRoot}/api/v2/search/episodes?anime=test&episode=`
    )
  })
})
