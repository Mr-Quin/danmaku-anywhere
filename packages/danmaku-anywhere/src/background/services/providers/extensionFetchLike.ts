import type { FetchLike } from '@mr-quin/dango'
import {
  consumeSetCookies,
  getCookiesForHost,
} from '@/background/netRequest/cookieReplay'
import { setSessionHeader } from '@/background/netRequest/setSessionHeader'

// `fetch` silently drops forbidden request headers like Origin / Referer /
// User-Agent, so when a manifest step declares `rewriteHeaders` we install a
// short-lived `chrome.declarativeNetRequest` session rule for the call.
//
// We also inject any cookies captured by the cookieReplay listener for the
// target host (Partitioned cookies are not auto-attached by the SW fetcher).
export const extensionFetchLike: FetchLike = async (input, init) => {
  const rewrite = init?.rewriteHeaders
  let effectiveRewrite = rewrite

  try {
    const urlHost = new URL(input).hostname
    const capturedCookies = getCookiesForHost(urlHost)
    const hasCookie =
      rewrite && Object.keys(rewrite).some((k) => k.toLowerCase() === 'cookie')
    if (capturedCookies && !hasCookie) {
      effectiveRewrite = { ...rewrite, Cookie: capturedCookies }
    }
  } catch {
    // non-parseable URL: skip cookie injection
  }

  const dnr =
    effectiveRewrite && Object.keys(effectiveRewrite).length > 0
      ? await setSessionHeader(input, effectiveRewrite)
      : null
  try {
    const { rewriteHeaders: _, ...requestInit } = init ?? {}
    const res = await fetch(input, requestInit as RequestInit)
    const headers = new Map<string, string>()
    res.headers.forEach((value, key) => headers.set(key, value))
    if (!headers.has('set-cookie')) {
      // Use res.url (final URL after redirects) since the listener keys on
      // the URL that actually received the Set-Cookie response.
      const captured = consumeSetCookies(res.url)
      if (captured !== null) {
        headers.set('set-cookie', captured)
      }
    }
    return {
      status: res.status,
      text: () => res.text(),
      bytes: async () => new Uint8Array(await res.arrayBuffer()),
      headers,
    }
  } finally {
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
