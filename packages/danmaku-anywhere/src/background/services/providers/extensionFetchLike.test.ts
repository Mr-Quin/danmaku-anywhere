import { afterEach, describe, expect, it, vi } from 'vitest'
import { extensionFetchLike } from './extensionFetchLike'

/**
 * extensionFetchLike hands its init to the global fetch after stripping the
 * DNR-only rewriteHeaders key. Covers that the browser cache mode survives that
 * hop, since a forced catalog refresh relies on it to skip the HTTP cache
 * rather than merely revalidate, and that rewriteHeaders never leaks into the
 * RequestInit.
 */

vi.mock('@/background/netRequest/cookieReplay', () => ({
  consumeSetCookies: () => null,
  getCookiesForHost: () => null,
}))

vi.mock('@/background/netRequest/setSessionHeader', () => ({
  setSessionHeader: async () => ({ removeRule: async () => {} }),
}))

function stubFetch() {
  const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) => ({
    status: 200,
    url: 'https://example.com/manifest',
    text: async () => '{}',
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: { forEach: () => {} },
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('extensionFetchLike', () => {
  it('forwards the browser cache mode to fetch', async () => {
    const fetchMock = stubFetch()

    await extensionFetchLike('https://example.com/manifest', {
      cache: 'reload',
      headers: { 'Cache-Control': 'no-cache' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      cache: 'reload',
      headers: { 'Cache-Control': 'no-cache' },
    })
  })

  it('sends no cache mode when the caller asks for none', async () => {
    const fetchMock = stubFetch()

    await extensionFetchLike('https://example.com/manifest', {})

    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('cache')
  })

  it('strips rewriteHeaders, which is a DNR instruction and not a RequestInit', async () => {
    const fetchMock = stubFetch()

    await extensionFetchLike('https://example.com/manifest', {
      rewriteHeaders: { Referer: 'https://example.com' },
    })

    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('rewriteHeaders')
  })
})
