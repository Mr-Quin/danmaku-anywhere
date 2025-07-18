import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'

describe('DanDanPlay API', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('proxies GET requests successfully', async () => {
    // Mock the DanDanPlay API response
    const mockResponse = {
      animes: [
        { title: 'Nichijou', id: 1 },
        { title: 'Nichijou Special', id: 2 },
      ],
    }
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=1800',
        },
      })
    )

    const request = new Request(
      'http://example.com/api/v1/ddp/v2/search/anime?keyword=nichijou'
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    const data: any = await response.json()
    expect(data).toHaveProperty('animes')
    expect(data.animes.length).toBeGreaterThan(0)

    // Check that the API was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.dandanplay.net/api/v2/search/anime?keyword=nichijou',
      })
    )

    // Check caching headers
    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBeDefined()
    expect(cacheControl).toContain('s-maxage=1800')
  })

  it('should cache GET requests - second request should not call fetch again', async () => {
    const mockResponse = {
      animes: [{ title: 'Test Anime', id: 123 }],
    }

    // Mock the API response for the first request
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=3600',
        },
      })
    )

    const url = 'http://example.com/api/v1/ddp/v2/search/anime?keyword=test'

    // First request - should call fetch
    const request1 = new Request(url)
    const response1 = await makeUnitTestRequest(request1)

    expect(response1.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second identical request - should hit cache, not call fetch again
    const request2 = new Request(url)
    const response2 = await makeUnitTestRequest(request2)

    expect(response2.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1) // Still only called once

    // Both responses should have the same data
    const data1 = await response1.json()
    const data2 = await response2.json()
    expect(data1).toEqual(data2)

    // Cache header should match the mock response
    const cacheControl = response1.headers.get('Cache-Control')
    expect(cacheControl).toBeDefined()
    expect(cacheControl).toContain('s-maxage=3600')
  })

  it('should not cache different requests', async () => {
    const mockResponse1 = { animes: [{ title: 'Anime 1', id: 1 }] }
    const mockResponse2 = { animes: [{ title: 'Anime 2', id: 2 }] }

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse1), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse2), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    // Two different requests should both call fetch
    const request1 = new Request(
      'http://example.com/api/v1/ddp/v2/search/anime?keyword=test1'
    )
    const request2 = new Request(
      'http://example.com/api/v1/ddp/v2/search/anime?keyword=test2'
    )

    await makeUnitTestRequest(request1)
    await makeUnitTestRequest(request2)

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should not cache non-GET requests', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const url = 'http://example.com/api/v1/ddp/v2/user/login'
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    }

    // Make two identical POST requests
    await makeUnitTestRequest(new Request(url, requestOptions))
    await makeUnitTestRequest(new Request(url, requestOptions))

    // Both should call fetch (no caching for POST)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('returns 404 for invalid DDP endpoints', async () => {
    const request = new Request('http://example.com/api/ddp/invalid')
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(404)
  })
})
