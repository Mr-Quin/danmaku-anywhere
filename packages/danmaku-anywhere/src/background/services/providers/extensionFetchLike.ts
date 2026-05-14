import type { FetchLike } from '@danmaku-anywhere/dango'
import { setSessionHeader } from '@/background/netRequest/setSessionHeader'

// `fetch` silently drops forbidden request headers like Origin / Referer /
// User-Agent, so when a manifest step declares `rewriteHeaders` we install a
// short-lived `chrome.declarativeNetRequest` session rule for the call.
// `setSessionHeader` is mutex-serialized so concurrent steps don't race on
// rule IDs.
export const extensionFetchLike: FetchLike = async (input, init) => {
  const rewrite = init?.rewriteHeaders
  const dnr =
    rewrite && Object.keys(rewrite).length > 0
      ? await setSessionHeader(input, rewrite)
      : null
  try {
    const res = await fetch(input, init as RequestInit)
    const headers = new Map<string, string>()
    res.headers.forEach((value, key) => headers.set(key, value))
    return {
      status: res.status,
      text: () => res.text(),
      bytes: async () => new Uint8Array(await res.arrayBuffer()),
      headers,
    }
  } finally {
    await dnr?.removeRule()
  }
}
