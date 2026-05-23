// Some sources (e.g. Youku's mtop endpoints) ship Set-Cookie with the
// `Partitioned` attribute. Chrome stores those in a per-top-frame
// partition, which extension service workers can't access — so subsequent
// `credentials: 'include'` fetches don't carry the token, and fetch() also
// filters Set-Cookie out of JS-visible response headers regardless of
// partitioning.
//
// This listener observes response headers and (a) caches the raw Set-Cookie
// strings keyed by URL so extensionFetchLike can synthesize the missing
// response header for the engine's `extractHeaders` to JSONata over,
// (b) re-plants Partitioned cookies in the unpartitioned cookie store via
// chrome.cookies.set so the browser attaches them on subsequent
// credentialed requests.

const setCookieByUrl = new Map<string, string[]>()

export function consumeSetCookies(url: string): string | null {
  const list = setCookieByUrl.get(url)
  if (!list || list.length === 0) return null
  setCookieByUrl.delete(url)
  return list.join('; ')
}

interface ParsedSetCookie {
  name: string
  value: string
  attrs: Record<string, string | true>
}

function parseSetCookie(line: string): ParsedSetCookie | null {
  const parts = line.split(';').map((s) => s.trim())
  const nv = parts.shift()
  if (!nv) return null
  const eq = nv.indexOf('=')
  if (eq === -1) return null
  const attrs: Record<string, string | true> = {}
  for (const p of parts) {
    const i = p.indexOf('=')
    if (i === -1) {
      attrs[p.toLowerCase()] = true
    } else {
      attrs[p.slice(0, i).toLowerCase()] = p.slice(i + 1)
    }
  }
  return { name: nv.slice(0, eq), value: nv.slice(eq + 1), attrs }
}

function attrsExpire(attrs: Record<string, string | true>): number | undefined {
  const maxAge = attrs['max-age']
  if (typeof maxAge === 'string') {
    const n = Number.parseInt(maxAge, 10)
    if (Number.isFinite(n) && n > 0) {
      return Math.floor(Date.now() / 1000) + n
    }
  }
  const expires = attrs.expires
  if (typeof expires === 'string') {
    const t = Date.parse(expires)
    if (Number.isFinite(t)) return Math.floor(t / 1000)
  }
  return undefined
}

export function setupCookieReplay(): void {
  if (
    typeof chrome === 'undefined' ||
    !chrome.webRequest ||
    !chrome.cookies?.set
  ) {
    return
  }
  chrome.webRequest.onHeadersReceived.addListener(
    (details): chrome.webRequest.BlockingResponse => {
      if (!details.responseHeaders) return {}
      for (const h of details.responseHeaders) {
        if (h.name.toLowerCase() !== 'set-cookie' || !h.value) continue
        // Cache the raw header text so extensionFetchLike can surface it to
        // the engine. Survives across the fetch() boundary even when
        // chrome.cookies.set hasn't finished yet.
        const existing = setCookieByUrl.get(details.url) ?? []
        existing.push(`${h.value.split(';')[0]?.trim() ?? ''}`)
        setCookieByUrl.set(details.url, existing)

        const parsed = parseSetCookie(h.value)
        if (!parsed) continue
        // Only re-plant Partitioned cookies; the rest land in the normal
        // store via the browser's default Set-Cookie handling.
        if (!('partitioned' in parsed.attrs)) continue
        const domain =
          typeof parsed.attrs.domain === 'string'
            ? parsed.attrs.domain
            : undefined
        const path =
          typeof parsed.attrs.path === 'string' ? parsed.attrs.path : '/'
        const expirationDate = attrsExpire(parsed.attrs)
        chrome.cookies
          .set({
            url: details.url,
            name: parsed.name,
            value: parsed.value,
            domain,
            path,
            secure: 'secure' in parsed.attrs,
            httpOnly: 'httponly' in parsed.attrs,
            sameSite: 'no_restriction',
            expirationDate,
          })
          .catch(() => {
            // Swallow: chrome.cookies.set rejects on invalid attribute
            // combinations (e.g. host-only cookies with no leading dot
            // domain). Nothing actionable from a background listener.
          })
      }
      return {}
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders', 'extraHeaders']
  )
}
