/**
 * Tests for cookieReplay: the webRequest listener that captures Set-Cookie
 * headers (stripped by fetch) and exposes them to extensionFetchLike via
 * consumeSetCookies / getCookiesForHost.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  consumeSetCookies as ConsumeFn,
  getCookiesForHost as GetCookiesFn,
  setupCookieReplay as SetupFn,
} from './cookieReplay'

type HeadersReceivedListener = (
  details: chrome.webRequest.OnHeadersReceivedDetails
) => chrome.webRequest.BlockingResponse | undefined

// Each test gets a fresh module instance (module-level maps start empty).
describe('cookieReplay', () => {
  let setupCookieReplay: typeof SetupFn
  let consumeSetCookies: typeof ConsumeFn
  let getCookiesForHost: typeof GetCookiesFn

  let addListener: ReturnType<typeof vi.fn>
  let capturedListener: HeadersReceivedListener

  function makeDetails(
    overrides: Record<string, unknown> = {}
  ): chrome.webRequest.OnHeadersReceivedDetails {
    return {
      requestId: '1',
      url: 'https://acs.youku.com/weakget',
      method: 'GET',
      frameId: 0,
      parentFrameId: -1,
      tabId: -1,
      type: 'xmlhttprequest',
      timeStamp: Date.now(),
      statusCode: 200,
      statusLine: 'HTTP/1.1 200 OK',
      responseHeaders: [],
      ...overrides,
    } as unknown as chrome.webRequest.OnHeadersReceivedDetails
  }

  beforeEach(async () => {
    vi.resetModules()
    addListener = vi.fn().mockImplementation((listener) => {
      capturedListener = listener
    })
    vi.stubGlobal('chrome', {
      webRequest: {
        onHeadersReceived: { addListener },
      },
    })
    const mod = await import('./cookieReplay')
    setupCookieReplay = mod.setupCookieReplay
    consumeSetCookies = mod.consumeSetCookies
    getCookiesForHost = mod.getCookiesForHost
    setupCookieReplay()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers a listener on onHeadersReceived with correct filter', () => {
    expect(addListener).toHaveBeenCalledOnce()
    const [, filter, extraInfoSpec] = addListener.mock.calls[0]
    expect(filter.urls).toContain('<all_urls>')
    expect(extraInfoSpec).toContain('responseHeaders')
    expect(extraInfoSpec).toContain('extraHeaders')
  })

  it('captures Set-Cookie from SW traffic (tabId === -1)', () => {
    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/weakget',
        tabId: -1,
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=abc123; Partitioned; Secure' },
        ],
      })
    )

    expect(consumeSetCookies('https://acs.youku.com/weakget')).toBe(
      '_m_h5_tk=abc123; Partitioned; Secure'
    )
  })

  it('is idempotent: calling setupCookieReplay twice registers the listener only once', () => {
    setupCookieReplay()
    expect(addListener).toHaveBeenCalledTimes(1)
  })

  it('ignores traffic from real tabs (tabId !== -1)', () => {
    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/page',
        tabId: 42,
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=should_not_capture' },
        ],
      })
    )

    expect(consumeSetCookies('https://acs.youku.com/page')).toBeNull()
    expect(getCookiesForHost('acs.youku.com')).toBeNull()
  })

  it('joins multiple Set-Cookie headers with "; "', () => {
    capturedListener(
      makeDetails({
        url: 'https://example.com/api',
        responseHeaders: [
          { name: 'set-cookie', value: 'a=1; Path=/' },
          { name: 'set-cookie', value: 'b=2; Path=/' },
        ],
      })
    )

    expect(consumeSetCookies('https://example.com/api')).toBe(
      'a=1; Path=/; b=2; Path=/'
    )
  })

  it('returns null for a URL that was never captured', () => {
    expect(consumeSetCookies('https://not-captured.example.com/')).toBeNull()
  })

  it('populates the per-host cookie jar for getCookiesForHost', () => {
    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/weakget',
        responseHeaders: [
          {
            name: 'set-cookie',
            value:
              '_m_h5_tk=HASH_TIMESTAMP; Partitioned; SameSite=None; Secure',
          },
          {
            name: 'set-cookie',
            value: '_m_h5_tk_enc=ENC_VALUE; Partitioned; SameSite=None; Secure',
          },
        ],
      })
    )

    const cookieHeader = getCookiesForHost('acs.youku.com')
    expect(cookieHeader).toContain('_m_h5_tk=HASH_TIMESTAMP')
    expect(cookieHeader).toContain('_m_h5_tk_enc=ENC_VALUE')
  })

  it('removes a cookie from the jar when Max-Age=0 arrives with a non-empty dummy value', () => {
    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/step1',
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=abc123; Secure' },
        ],
      })
    )
    expect(getCookiesForHost('acs.youku.com')).toBe('_m_h5_tk=abc123')

    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/step2',
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=deleted; Max-Age=0; Path=/' },
        ],
      })
    )
    expect(getCookiesForHost('acs.youku.com')).toBeNull()
  })

  it('removes a cookie from the jar when an empty-value Set-Cookie arrives', () => {
    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/step1',
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=abc123; Secure' },
        ],
      })
    )
    expect(getCookiesForHost('acs.youku.com')).toBe('_m_h5_tk=abc123')

    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/step2',
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=; Max-Age=0; Path=/' },
        ],
      })
    )
    expect(getCookiesForHost('acs.youku.com')).toBeNull()
  })

  it('overwrites a cookie in the jar when the same name arrives again', () => {
    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/first',
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=OLD_TOKEN; Secure' },
        ],
      })
    )
    capturedListener(
      makeDetails({
        url: 'https://acs.youku.com/second',
        responseHeaders: [
          { name: 'set-cookie', value: '_m_h5_tk=NEW_TOKEN; Secure' },
        ],
      })
    )

    expect(getCookiesForHost('acs.youku.com')).toBe('_m_h5_tk=NEW_TOKEN')
  })

  it('returns null from getCookiesForHost for unknown hosts', () => {
    expect(getCookiesForHost('unknown.example.com')).toBeNull()
  })

  it('skips headers with no value', () => {
    capturedListener(
      makeDetails({
        url: 'https://example.com/empty',
        responseHeaders: [{ name: 'set-cookie', value: '' }],
      })
    )

    expect(consumeSetCookies('https://example.com/empty')).toBeNull()
  })

  it('is case-insensitive to header name casing', () => {
    capturedListener(
      makeDetails({
        url: 'https://example.com/caps',
        responseHeaders: [{ name: 'Set-Cookie', value: 'x=1' }],
      })
    )

    expect(consumeSetCookies('https://example.com/caps')).toBe('x=1')
  })
})
