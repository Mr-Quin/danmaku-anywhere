import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchUrlAsFile,
  ImportFromUrlError,
  validateImportUrl,
} from './fetchUrlAsFile'

/**
 * Verifies the URL-to-File helper that powers "Import from URL".
 *
 * Covers `validateImportUrl` (scheme/extension/basename rules, percent-decoding,
 * query/hash stripping) and `fetchUrlAsFile` (happy path, HTTP and network
 * failures, abort, size-cap enforcement with `reader.cancel()`).
 */

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('validateImportUrl', () => {
  it('rejects an empty string as invalid_url', () => {
    expect(validateImportUrl('')).toEqual({ ok: false, reason: 'invalid_url' })
  })

  it('rejects a malformed URL as invalid_url', () => {
    expect(validateImportUrl('not a url')).toEqual({
      ok: false,
      reason: 'invalid_url',
    })
  })

  it('rejects file:// URLs as invalid_scheme', () => {
    expect(validateImportUrl('file:///tmp/danmaku.xml')).toEqual({
      ok: false,
      reason: 'invalid_scheme',
    })
  })

  it('rejects data: URLs as invalid_scheme', () => {
    expect(validateImportUrl('data:application/json,{}')).toEqual({
      ok: false,
      reason: 'invalid_scheme',
    })
  })

  it('rejects chrome-extension:// URLs as invalid_scheme', () => {
    expect(validateImportUrl('chrome-extension://abc/file.xml')).toEqual({
      ok: false,
      reason: 'invalid_scheme',
    })
  })

  it('rejects URLs without a recognized extension', () => {
    expect(validateImportUrl('https://example.com/file.txt')).toEqual({
      ok: false,
      reason: 'unsupported_extension',
    })
  })

  it('rejects URLs whose basename is "."', () => {
    expect(validateImportUrl('https://example.com/some/path/.')).toEqual({
      ok: false,
      reason: 'unsupported_extension',
    })
  })

  it('rejects URLs whose basename is empty', () => {
    expect(validateImportUrl('https://example.com/')).toEqual({
      ok: false,
      reason: 'unsupported_extension',
    })
  })

  it('accepts .json / .xml / .bin / .zip with mixed case', () => {
    expect(validateImportUrl('https://example.com/a.JSON')).toMatchObject({
      ok: true,
      filename: 'a.JSON',
      extension: '.json',
    })
    expect(validateImportUrl('http://example.com/a.Xml')).toMatchObject({
      ok: true,
      filename: 'a.Xml',
      extension: '.xml',
    })
    expect(validateImportUrl('https://example.com/a.BIN')).toMatchObject({
      ok: true,
      filename: 'a.BIN',
      extension: '.bin',
    })
    expect(validateImportUrl('https://example.com/a.Zip')).toMatchObject({
      ok: true,
      filename: 'a.Zip',
      extension: '.zip',
    })
  })

  it('strips query/hash before checking extension', () => {
    expect(
      validateImportUrl('https://example.com/file.json?token=abc#frag')
    ).toMatchObject({ ok: true, filename: 'file.json', extension: '.json' })
  })

  it('decodes percent-escapes in the basename', () => {
    expect(
      validateImportUrl('https://example.com/folder/%E5%BC%B9%E5%B9%95.xml')
    ).toMatchObject({ ok: true, filename: '弹幕.xml', extension: '.xml' })
  })

  it('uses only the basename, never the multi-segment path', () => {
    const result = validateImportUrl('https://example.com/path/to/episode.json')
    expect(result).toMatchObject({ ok: true, filename: 'episode.json' })
    if (result.ok) {
      expect(result.filename).not.toContain('/')
    }
  })
})

function mockFetchOnce(response: Response) {
  const fetchMock = vi.fn().mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('fetchUrlAsFile', () => {
  it('returns a File with correct name, type, and bytes for a 200 response', async () => {
    const payload = new TextEncoder().encode('{"hello":"world"}')
    mockFetchOnce(new Response(payload, { status: 200 }))

    const file = await fetchUrlAsFile('https://example.com/data.json')

    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('data.json')
    expect(file.type).toBe('application/json')
    const bytes = new Uint8Array(await file.arrayBuffer())
    expect(Array.from(bytes)).toEqual(Array.from(payload))
  })

  it('tags .xml with text/xml and .bin with application/octet-stream', async () => {
    mockFetchOnce(new Response('<i></i>', { status: 200 }))
    const xml = await fetchUrlAsFile('https://example.com/a.xml')
    expect(xml.type).toBe('text/xml')

    mockFetchOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
    const bin = await fetchUrlAsFile('https://example.com/a.bin')
    expect(bin.type).toBe('application/octet-stream')
  })

  it('rejects http_error with status for a non-2xx response', async () => {
    mockFetchOnce(new Response('nope', { status: 404 }))

    const err = await fetchUrlAsFile('https://example.com/a.json').catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(ImportFromUrlError)
    expect((err as ImportFromUrlError).code).toBe('http_error')
    expect((err as ImportFromUrlError).params).toEqual({ status: 404 })
  })

  it('rejects fetch_failed when fetch itself throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new TypeError('network down'))
    )

    const err = await fetchUrlAsFile('https://example.com/a.json').catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(ImportFromUrlError)
    expect((err as ImportFromUrlError).code).toBe('fetch_failed')
  })

  it('rejects aborted when the signal is aborted mid-fetch', async () => {
    const controller = new AbortController()
    const abortErr = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        controller.abort()
        return Promise.reject(abortErr)
      })
    )

    const err = await fetchUrlAsFile('https://example.com/a.json', {
      signal: controller.signal,
    }).catch((e) => e)
    expect(err).toBeInstanceOf(ImportFromUrlError)
    expect((err as ImportFromUrlError).code).toBe('aborted')
  })

  it('rejects size_limit_exceeded and cancels the reader when body is too large', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined)
    const chunks = [new Uint8Array(8), new Uint8Array(8), new Uint8Array(8)]
    let i = 0
    const reader = {
      read: vi.fn().mockImplementation(async () => {
        if (i >= chunks.length) {
          return { done: true, value: undefined }
        }
        return { done: false, value: chunks[i++] }
      }),
      cancel,
    }
    const body = { getReader: () => reader }
    const response = {
      ok: true,
      status: 200,
      body,
    } as unknown as Response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response))

    const err = await fetchUrlAsFile('https://example.com/a.bin', {
      maxBytes: 16,
    }).catch((e) => e)

    expect(err).toBeInstanceOf(ImportFromUrlError)
    expect((err as ImportFromUrlError).code).toBe('size_limit_exceeded')
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid_url before calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const err = await fetchUrlAsFile('not a url').catch((e) => e)
    expect(err).toBeInstanceOf(ImportFromUrlError)
    expect((err as ImportFromUrlError).code).toBe('invalid_url')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects invalid_scheme before calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const err = await fetchUrlAsFile('file:///etc/passwd.json').catch((e) => e)
    expect(err).toBeInstanceOf(ImportFromUrlError)
    expect((err as ImportFromUrlError).code).toBe('invalid_scheme')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
