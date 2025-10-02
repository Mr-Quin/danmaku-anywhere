import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { configureApiStore } from '../../shared/store'
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
    it('should throw an error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
        animes: [],
        hasMore: false,
      }

      mockFetchResponse(mockResponse)

      await expect(searchSearchEpisodes({ anime: 'test' })).rejects.toThrow(
        DanDanPlayApiException
      )
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(searchSearchEpisodes({ anime: 'test' })).rejects.toThrow(
        ResponseParseException
      )
    })
  })

  describe('searchSearchAnime', () => {
    it('should throw an error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
      }

      mockFetchResponse(mockResponse)

      await expect(searchSearchAnime('MyGo')).rejects.toThrow(
        DanDanPlayApiException
      )
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(searchSearchAnime('MyGo')).rejects.toThrow(
        ResponseParseException
      )
    })
  })

  describe('commentGetComment', () => {
    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(commentGetComment(1)).rejects.toThrow(ResponseParseException)
    })
  })

  describe('getBangumiAnime', () => {
    it('should throw an error on API error', async () => {
      const mockResponse = {
        errorCode: 1,
        errorMessage: 'Error',
        success: false,
      }

      mockFetchResponse(mockResponse)

      await expect(getBangumiAnime('1')).rejects.toThrow(DanDanPlayApiException)
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(getBangumiAnime('1')).rejects.toThrow(ResponseParseException)
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

    const customRoot = 'https://example.com'
    configureApiStore({ ddpCustomApiUrl: customRoot, ddpUseCustomUrl: true })

    await searchSearchEpisodes({ anime: 'test' })

    expect(mockFetch.mock.calls[0][0]).toEqual(
      `${customRoot}/v2/search/episodes?anime=test`
    )
  })
})
