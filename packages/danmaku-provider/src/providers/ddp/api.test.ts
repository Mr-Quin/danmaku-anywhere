import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResponseParseException } from '../../exceptions/ResponseParseException'
import { createFetchOverride, mockFetchResponse } from '../utils/testUtils'
import {
  commentGetComment,
  getBangumiAnime,
  searchSearchAnime,
  searchSearchEpisodes,
} from './api'
import { DanDanPlayApiException } from './exceptions'

const fetchHeaders = {
  Origin: 'https://danmaku.weeblify.app',
}

const overrideFetchArgs = createFetchOverride()

describe('DanDanPlay API', () => {
  beforeEach(() => {
    configureApiStore({ baseUrl: 'http://127.0.0.1:8787' })
    vi.resetAllMocks()
  })

  describe('searchSearchEpisodes', () => {
    it('should not throw on fetch', async () => {
      overrideFetchArgs(fetchHeaders)

      await expect(
        searchSearchEpisodes({ anime: 'MyGo' })
      ).resolves.not.toThrow()
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
    it('should not throw on fetch', async () => {
      overrideFetchArgs(fetchHeaders)

      await expect(searchSearchAnime('MyGo')).resolves.not.toThrow()
    })

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
    it('should parse fetched comments', async () => {
      overrideFetchArgs(fetchHeaders)

      const episodeId = 180300001 // 金牌得主 Ep1
      await expect(commentGetComment(episodeId)).resolves.not.toThrow()
    })

    it('should throw an error on unexpected data', async () => {
      mockFetchResponse({})

      await expect(commentGetComment(1)).rejects.toThrow(ResponseParseException)
    })
  })

  describe('getBangumiAnime', () => {
    it('should not throw on fetch', async () => {
      overrideFetchArgs(fetchHeaders)

      const animeId = '17981' // MyGo anime id
      await expect(getBangumiAnime(animeId)).resolves.not.toThrow()
    })

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
    configureApiStore({ baseUrl: customRoot })

    await searchSearchEpisodes({ anime: 'test' })

    expect(mockFetch.mock.calls[0][0]).toEqual(
      `${customRoot}/api/v2/search/episodes?anime=test`
    )
  })
})
