// fetch() strips Set-Cookie (forbidden response header). This module
// captures it from webRequest and replays it for manifest engine use.

const CAPTURE_TTL_MS = 60_000

interface Captured {
  cookies: string[]
  insertedAt: number
}

const setCookieByUrl = new Map<string, Captured>()
const cookieJarByHost = new Map<string, Map<string, string>>()
let isSetUp = false

export function consumeSetCookies(url: string): string | null {
  const entry = setCookieByUrl.get(url)
  if (!entry || entry.cookies.length === 0) {
    return null
  }
  return entry.cookies.join('; ')
}

export function getCookiesForHost(host: string): string | null {
  const jar = cookieJarByHost.get(host)
  if (!jar || jar.size === 0) {
    return null
  }
  return Array.from(jar, ([name, value]) => `${name}=${value}`).join('; ')
}

function pruneStale(now: number): void {
  for (const [url, entry] of setCookieByUrl) {
    if (now - entry.insertedAt > CAPTURE_TTL_MS) {
      setCookieByUrl.delete(url)
    }
  }
}

interface ParsedSetCookie {
  name: string
  value: string
}

function parseSetCookie(line: string): ParsedSetCookie | null {
  const semi = line.indexOf(';')
  const nv = semi === -1 ? line : line.slice(0, semi)
  const eq = nv.indexOf('=')
  if (eq === -1) {
    return null
  }
  const name = nv.slice(0, eq).trim()
  if (!name) {
    return null
  }
  return { name, value: nv.slice(eq + 1).trim() }
}

export function setupCookieReplay(): void {
  if (typeof chrome === 'undefined' || !chrome.webRequest) {
    return
  }
  if (isSetUp) {
    return
  }
  isSetUp = true
  chrome.webRequest.onHeadersReceived.addListener(
    (details): chrome.webRequest.BlockingResponse => {
      // tabId === -1 means the request originated from the extension service
      // worker, not from a tab. Skip page traffic so normal browsing doesn't
      // populate the cookie cache.
      if (details.tabId !== -1 || !details.responseHeaders) {
        return {}
      }
      const now = Date.now()
      pruneStale(now)

      const url = new URL(details.url)
      const host = url.hostname
      const captured: string[] = []

      for (const h of details.responseHeaders) {
        if (h.name.toLowerCase() !== 'set-cookie' || !h.value) {
          continue
        }
        captured.push(h.value)

        const parsed = parseSetCookie(h.value)
        if (!parsed) {
          continue
        }
        let jar = cookieJarByHost.get(host)
        if (!jar) {
          jar = new Map()
          cookieJarByHost.set(host, jar)
        }
        if (parsed.value === '') {
          jar.delete(parsed.name)
        } else {
          jar.set(parsed.name, parsed.value)
        }
      }

      if (captured.length > 0) {
        setCookieByUrl.set(details.url, { cookies: captured, insertedAt: now })
      }
      return {}
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders', 'extraHeaders']
  )
}
