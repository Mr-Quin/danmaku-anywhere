import type { FetchLike } from '@mr-quin/dango'
import {
  consumeSetCookies,
  getCookiesForHost,
} from '@/background/netRequest/cookieReplay'
import { setSessionHeader } from '@/background/netRequest/setSessionHeader'

// fetch() drops forbidden request headers, so rewriteHeaders steps use a
// short-lived DNR session rule. Captured cookies are also injected since
// Partitioned cookies are not auto-attached on service-worker fetch() calls.
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
      // Try the final URL first; fall back to input if a redirect moved the response.
      let captured = consumeSetCookies(res.url)
      if (captured === null && input !== res.url) {
        captured = consumeSetCookies(input)
      }
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
