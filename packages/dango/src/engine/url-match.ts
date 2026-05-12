import type { Manifest } from '../manifest/schema.js'

/**
 * Test a URL against a single urlMatch entry. Returns true if the URL's
 * host matches `host` (exact or `*.domain` wildcard) AND its pathname matches
 * the `path` regex.
 *
 * Path patterns are compiled once per call. For high-volume use, consumers
 * should cache compiled regexes themselves; the typical use case is "user
 * navigated to a page, find one manifest" which runs at most a few times
 * per page load.
 */
export function urlMatches(
  url: string,
  entry: { host: string; path: string }
): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  /** Use `.hostname` (no port) for consistent matching. */
  const host = parsed.hostname
  const wantHost = entry.host
  let hostOk = false
  if (wantHost === host) {
    hostOk = true
  } else if (wantHost.startsWith('*.')) {
    hostOk = host.endsWith(wantHost.slice(1))
  }
  if (!hostOk) return false
  try {
    return new RegExp(entry.path).test(parsed.pathname)
  } catch {
    return false
  }
}

/**
 * Returns the first manifest in the list whose urlMatch contains a pattern
 * that matches the URL. Null if none match. Consumers register manifests
 * in priority order — the engine doesn't impose one.
 */
export function findManifestForUrl(
  manifests: readonly Manifest[],
  url: string
): Manifest | null {
  for (const m of manifests) {
    for (const entry of m.urlMatch) {
      if (urlMatches(url, entry)) return m
    }
  }
  return null
}
