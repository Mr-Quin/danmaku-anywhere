import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestUrl } from '@/test-utils/createTestUrl'
import { makeUnitTestRequest } from '@/test-utils/makeUnitTestRequest'

describe('Bangumi proxy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards GET /next/* to next.bgm.tv preserving path and query', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    const request = new Request(
      createTestUrl('/bangumi/next/p1/trending/subjects', {
        query: { type: '2', limit: '20' },
      })
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)

    const forwarded = fetchSpy.mock.calls[0][0] as Request
    const forwardedUrl = new URL(forwarded.url)
    expect(forwardedUrl.origin).toBe('https://next.bgm.tv')
    expect(forwardedUrl.pathname).toBe('/p1/trending/subjects')
    expect(forwardedUrl.searchParams.get('type')).toBe('2')
    expect(forwardedUrl.searchParams.get('limit')).toBe('20')
  })

  it('forwards POST /api/* to api.bgm.tv preserving method and body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

    const body = JSON.stringify({ keyword: 'test' })
    const request = new Request(
      createTestUrl('/bangumi/api/v0/search/subjects'),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      }
    )
    const response = await makeUnitTestRequest(request)

    expect(response.status).toBe(200)

    const forwarded = fetchSpy.mock.calls[0][0] as Request
    const forwardedUrl = new URL(forwarded.url)
    expect(forwarded.method).toBe('POST')
    expect(forwardedUrl.origin).toBe('https://api.bgm.tv')
    expect(forwardedUrl.pathname).toBe('/v0/search/subjects')
    expect(await forwarded.text()).toBe(body)
  })

  it('forwards only allowlisted headers and sets a User-Agent', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    const request = new Request(createTestUrl('/bangumi/next/p1/calendar'), {
      headers: {
        cookie: 'session=secret',
        authorization: 'Bearer leak-me',
        accept: 'application/json',
      },
    })
    await makeUnitTestRequest(request)

    const forwarded = fetchSpy.mock.calls[0][0] as Request
    expect(forwarded.headers.get('cookie')).toBeNull()
    expect(forwarded.headers.get('authorization')).toBeNull()
    expect(forwarded.headers.get('accept')).toBe('application/json')
    expect(forwarded.headers.get('user-agent')).toContain('danmaku-anywhere')
  })

  it.each([
    '/bangumi/next//evil.com/x',
    '/bangumi/api//evil.com/x',
    '/bangumi/next/%2f%2fevil.com/x',
  ])('keeps the upstream origin pinned for %s', async (path) => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    await makeUnitTestRequest(new Request(createTestUrl(path)))

    const forwarded = fetchSpy.mock.calls[0][0] as Request
    expect(new URL(forwarded.url).hostname).toMatch(/\.bgm\.tv$/)
    expect(new URL(forwarded.url).hostname).not.toBe('evil.com')
  })
})
