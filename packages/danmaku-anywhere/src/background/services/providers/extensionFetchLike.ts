import type { FetchLike } from '@danmaku-anywhere/dango'
import { setSessionHeader } from '@/background/netRequest/setSessionHeader'

/**
 * `FetchLike` for `ManifestRunner` running inside the extension. Wraps each
 * fetch with a `chrome.declarativeNetRequest` session rule when the manifest
 * step declared `rewriteHeaders` (Origin / Referer / User-Agent), since
 * browser `fetch` silently drops those when JS sets them directly.
 *
 * `setSessionHeader` is internally serialized via a Mutex, so concurrent
 * `forEach` iterations (e.g. Bilibili's protobuf segment loop with
 * concurrency 4) don't race on rule IDs.
 */
interface FetchInit {
  method?: string
  headers?: Record<string, string>
  body?: string
  credentials?: 'include' | 'omit'
  signal?: AbortSignal
  rewriteHeaders?: Record<string, string>
}

type RawFetchInit = Omit<FetchInit, 'rewriteHeaders'>

export const extensionFetchLike: FetchLike = async (
  input: string,
  init?: FetchInit
) => {
  const rewrite = init?.rewriteHeaders
  if (rewrite && Object.keys(rewrite).length > 0) {
    await using _ = await setSessionHeader(input, rewrite)
    return rawFetch(input, init)
  }
  return rawFetch(input, init)
}

async function rawFetch(input: string, init?: RawFetchInit) {
  const res = await fetch(input, {
    method: init?.method,
    headers: init?.headers,
    body: init?.body,
    credentials: init?.credentials,
    signal: init?.signal,
  })
  const headers = new Map<string, string>()
  res.headers.forEach((value, key) => {
    headers.set(key, value)
  })
  return {
    status: res.status,
    text: async () => {
      return res.text()
    },
    bytes: async () => {
      return new Uint8Array(await res.arrayBuffer())
    },
    headers,
  }
}
