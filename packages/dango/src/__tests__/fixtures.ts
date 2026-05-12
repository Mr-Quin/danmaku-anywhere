import type { FetchLike } from '../engine/http.js'

export interface MockResponse {
  status?: number
  /** Response body. String for text/json/xml/jsonp; Uint8Array for proto. */
  body: string | Uint8Array
  headers?: Record<string, string>
}

/**
 * Build a fetcher backed by a URL → response map. Records the request init too,
 * so tests can assert what was actually sent over the wire.
 */
export function mockFetcher(
  handlers: Record<
    string,
    MockResponse | ((url: string, init: unknown) => MockResponse)
  >
): {
  fetcher: FetchLike
  calls: Array<{ url: string; init?: unknown }>
} {
  const calls: Array<{ url: string; init?: unknown }> = []
  const fetcher: FetchLike = async (input, init) => {
    calls.push({ url: input, init })
    // Look up by URL — strip query for matching, but allow exact match too.
    let handler = handlers[input]
    if (handler === undefined) {
      const noQuery = input.split('?')[0]
      handler = handlers[noQuery]
    }
    if (handler === undefined) {
      throw new Error(`mockFetcher: no handler for ${input}`)
    }
    const resp = typeof handler === 'function' ? handler(input, init) : handler
    const headers = new Map<string, string>(Object.entries(resp.headers ?? {}))
    const isBytes = resp.body instanceof Uint8Array
    return {
      status: resp.status ?? 200,
      text: async () =>
        isBytes
          ? new TextDecoder().decode(resp.body as Uint8Array)
          : (resp.body as string),
      bytes: async () =>
        isBytes
          ? (resp.body as Uint8Array)
          : new TextEncoder().encode(resp.body as string),
      headers,
    }
  }
  return { fetcher, calls }
}
