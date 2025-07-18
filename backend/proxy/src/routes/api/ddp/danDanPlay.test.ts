import { fetchMock } from 'cloudflare:test'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'

describe('DanDanPlay API', () => {
  beforeAll(() => {
    fetchMock.activate()
    fetchMock.disableNetConnect()
  })

  afterEach(() => fetchMock.assertNoPendingInterceptors())

  it('proxies GET requests successfully', async () => {
    // Mock the DanDanPlay API response
    const mockResponse = {
      animes: [
        { title: 'Nichijou', id: 1 },
        { title: 'Nichijou Special', id: 2 },
      ],
    }

    fetchMock
      .get('https://api.dandanplay.net')
      .intercept({
        path: '/api/v2/search/anime',
        query: {
          keyword: 'nichijou',
        },
      })
      .reply(200, JSON.stringify(mockResponse))

    const request = new Request(
      'http://example.com/api/v1/ddp/v2/search/anime?keyword=nichijou'
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    const data: any = await response.json()
    expect(data).toHaveProperty('animes')
    expect(data.animes.length).toBeGreaterThan(0)

    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toBeDefined()
    expect(cacheControl).toContain('s-maxage=1800') // default cache time
  })

  it('should cache GET requests - second request should not call fetch again', async () => {
    const mockResponse = {
      animes: [{ title: 'Test Anime', id: 123 }],
    }

    // should only be called once due to caching
    fetchMock
      .get('https://api.dandanplay.net')
      .intercept({
        path: '/api/v2/search/anime',
        query: {
          keyword: 'test',
        },
      })
      .reply(200, JSON.stringify(mockResponse), {
        headers: {
          'Cache-Control': 'max-age=3600', // max age should be respected when cached
        },
      })
      .times(1)

    const url = 'http://example.com/api/v1/ddp/v2/search/anime?keyword=test'

    // First request - should call fetch
    const request1 = new Request(url)
    const response1 = await makeUnitTestRequest(request1)

    expect(response1.status).toBe(200)

    // Second identical request - should hit cache, not call fetch again
    const request2 = new Request(url)
    const response2 = await makeUnitTestRequest(request2)

    expect(response2.status).toBe(200)

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

    fetchMock
      .get('https://api.dandanplay.net')
      .intercept({
        path: '/api/v2/search/anime',
        query: {
          keyword: 'test1',
        },
      })
      .reply(200, JSON.stringify(mockResponse1))

    fetchMock
      .get('https://api.dandanplay.net')
      .intercept({
        path: '/api/v2/search/anime',
        query: {
          keyword: 'test2',
        },
      })
      .reply(200, JSON.stringify(mockResponse2))

    // two different requests should both call fetch
    const request1 = new Request(
      'http://example.com/api/v1/ddp/v2/search/anime?keyword=test1'
    )
    const request2 = new Request(
      'http://example.com/api/v1/ddp/v2/search/anime?keyword=test2'
    )

    await makeUnitTestRequest(request1)
    await makeUnitTestRequest(request2)
  })

  it('should not cache non-GET requests', async () => {
    const mock1 = fetchMock
      .get('https://api.dandanplay.net')
      .intercept({ path: '/api/v2/user/login', method: 'POST' })
      .reply(200, JSON.stringify({ success: true }))

    // call twice
    mock1.times(2)

    const url = 'http://example.com/api/v1/ddp/v2/user/login'
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    }

    // Make two identical POST requests
    const res1 = await makeUnitTestRequest(new Request(url, requestOptions))
    const res2 = await makeUnitTestRequest(new Request(url, requestOptions))

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(await res1.json()).toEqual(await res2.json())
  })

  it('returns 404 for invalid DDP endpoints', async () => {
    const request = new Request('http://example.com/api/ddp/invalid')
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(404)
  })
})
