import type { FetchLike } from '@danmaku-anywhere/dango'
import { setSessionHeader } from '@/background/netRequest/setSessionHeader'

/**
 * `FetchLike` for `ManifestRunner` running inside the extension. When the
 * manifest step declared `rewriteHeaders` (Origin / Referer / User-Agent),
 * wraps the request in a `chrome.declarativeNetRequest` session rule
 * lifecycle — browser `fetch` silently drops those headers when JS sets
 * them directly. `setSessionHeader` is mutex-serialized, so concurrent
 * `forEach` iterations don't race on rule IDs.
 *
 * Unknown init fields (notably `rewriteHeaders`) are ignored by `fetch`.
 * The only adapter work is mapping `Response` to the `FetchLike` shape:
 * `Headers` → `Map<string, string>` and `arrayBuffer()` → `Uint8Array`.
 */
export const extensionFetchLike: FetchLike = async (input, init) => {
  const rewrite = init?.rewriteHeaders
  const dnr =
    rewrite && Object.keys(rewrite).length > 0
      ? await setSessionHeader(input, rewrite)
      : null
  try {
    const res = await fetch(input, init as RequestInit)
    const headers = new Map<string, string>()
    res.headers.forEach((value, key) => {
      headers.set(key, value)
    })
    return {
      status: res.status,
      text: () => {
        return res.text()
      },
      bytes: async () => {
        return new Uint8Array(await res.arrayBuffer())
      },
      headers,
    }
  } finally {
    if (dnr) {
      await dnr.removeRule()
    }
  }
}
