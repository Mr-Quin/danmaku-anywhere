import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'
import '@/test-utils/mockBindings'
import { env } from 'cloudflare:test'
import { createTestUrl } from '@/test-utils/createTestUrl'

describe('DanDanPlay API', () => {
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    env.DDP_SERVICE = {
      fetch: fetchMock,
    } as any
  })

  it('returns 400 when path parameter is missing', async () => {
    const request = new Request(createTestUrl('/ddp/v1?keyword=test'))
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(400)
    const data: any = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error).toBe('Missing required "path" query parameter')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards request to DDP service with preserved path query', async () => {
    const request = new Request(
      createTestUrl('/ddp/v1', {
        query: {
          path: '/v2/search/anime?keyword=nichijou',
        },
      })
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const forwardedRequest = fetchMock.mock.calls[0][0]
    expect(forwardedRequest.url).toBe(
      'http://example.com/v1?path=%2Fv2%2Fsearch%2Fanime%3Fkeyword%3Dnichijou'
    )
  })

  it('preserves additional query parameters when forwarding', async () => {
    const request = new Request(
      createTestUrl('/ddp/v1', {
        query: {
          path: '/v2/comment/12345?from=0&withRelated=true',
          source: 'legacy',
        },
      })
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)
    const forwardedRequest = fetchMock.mock.calls[0][0]
    expect(forwardedRequest.url).toBe(
      'http://example.com/v1?path=%2Fv2%2Fcomment%2F12345%3Ffrom%3D0%26withRelated%3Dtrue&source=legacy'
    )
  })
})
