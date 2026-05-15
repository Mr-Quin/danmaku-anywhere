import type { FetchLike } from '@danmaku-anywhere/dango'
import { setSessionHeader } from '@/background/netRequest/setSessionHeader'

// `fetch` silently drops forbidden request headers like Origin / Referer /
// User-Agent, so when a manifest step declares `rewriteHeaders` we install a
// short-lived `chrome.declarativeNetRequest` session rule for the call.
export const extensionFetchLike: FetchLike = async (input, init) => {
  const rewrite = init?.rewriteHeaders
  const dnr =
    rewrite && Object.keys(rewrite).length > 0
      ? await setSessionHeader(input, rewrite)
      : null
  try {
    // Build a real RequestInit from the dango FetchLike init; drop the
    // `rewriteHeaders` field (applied above via DNR) and the rest of the
    // dango-only shape that doesn't belong on the wire request.
    const requestInit: RequestInit = {}
    if (init?.method !== undefined) requestInit.method = init.method
    if (init?.headers !== undefined) requestInit.headers = init.headers
    if (init?.body !== undefined) requestInit.body = init.body
    if (init?.credentials !== undefined)
      requestInit.credentials = init.credentials
    if (init?.signal !== undefined) requestInit.signal = init.signal
    const res = await fetch(input, requestInit)
    const headers = new Map<string, string>()
    res.headers.forEach((value, key) => headers.set(key, value))
    return {
      status: res.status,
      text: () => res.text(),
      bytes: async () => new Uint8Array(await res.arrayBuffer()),
      headers,
    }
  } finally {
    // Swallow cleanup errors so they don't mask the original fetch error.
    // Stale session rules are GC'd on session end.
    if (dnr) {
      try {
        await dnr.removeRule()
      } catch (cleanupErr) {
        console.warn(
          'extensionFetchLike: failed to remove session rule:',
          cleanupErr
        )
      }
    }
  }
}
