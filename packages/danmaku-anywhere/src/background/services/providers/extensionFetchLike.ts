import type { FetchLike } from '@danmaku-anywhere/dango'
import { setSessionHeader } from '@/background/netRequest/setSessionHeader'

// fetch() filters Set-Cookie out of JS-visible response headers, but the
// browser still stores it. Manifests that need the cookie value (e.g. Youku
// signing on `_m_h5_tk`) can't reach it through `extractHeaders` alone.
// After a credentials:include call we read the URL's cookie store and stuff
// the result back into the response headers map as a synthesized `set-cookie`,
// so the engine's extractHeaders can JSONata over it the same way it would
// against a permissive endpoint.
async function readCookiesAsSetCookie(url: string): Promise<string | null> {
  try {
    const cookies = await chrome.cookies.getAll({ url })
    if (cookies.length === 0) return null
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  } catch {
    return null
  }
}

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
    // Drop `rewriteHeaders` (applied via DNR above) before handing to fetch.
    const { rewriteHeaders: _, ...requestInit } = init ?? {}
    const res = await fetch(input, requestInit as RequestInit)
    const headers = new Map<string, string>()
    res.headers.forEach((value, key) => headers.set(key, value))
    if (init?.credentials === 'include' && !headers.has('set-cookie')) {
      const synthesized = await readCookiesAsSetCookie(input)
      if (synthesized !== null) {
        headers.set('set-cookie', synthesized)
      }
    }
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
