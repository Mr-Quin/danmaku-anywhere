import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ResponseParseException } from '../../exceptions/ResponseParseException'

import { searchAnime, fetchComments, getBangumiAnime, configure } from './api'
import { DDPException } from './DDPException'

const mockFetchResponse = (data: any) => {
  const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
    json: vi.fn().mockResolvedValue(data),
  } as any)

  return mockFetch
}

describe('DandanPlay API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('searchAnime', () => {
    it.skip('should not throw on fetch', async () => {
      // not mocking fetch here to test the actual fetch
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

      await expect(searchAnime({ anime: 'test' })).rejects.toThrow(DDPException)
    })

    it('should throw an error on response parse error', async () => {
      mockFetchResponse({})

      await expect(searchAnime({ anime: 'test' })).rejects.toThrow(
        ResponseParseException
      )
    })
  })

  describe('fetchComments', () => {
    it.skip('should not throw on fetch', async () => {
      const episodeId = 179810001 // MyGo episode 1
      await expect(fetchComments(episodeId)).resolves.not.toThrow()
    })

    it('should throw an error on response parse error', async () => {
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

      await expect(getBangumiAnime(1)).rejects.toThrow(DDPException)
    })

    it('should throw an error on response parse error', async () => {
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
