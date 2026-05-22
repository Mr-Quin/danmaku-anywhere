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
  return matchUrl(url, entry) !== null
}

export interface UrlMatchResult {
  /** Named capture groups from the `path` regex (empty object if none). */
  groups: Record<string, string>
}

/**
 * Like `urlMatches` but returns the named capture groups when matched, or
 * null when not. Used by parseUrl pipelines to extract identifiers from the
 * URL (e.g. `(?<ssid>\d+)` becomes `inputs.ssid`).
 */
export function matchUrl(
  url: string,
  entry: { host: string; path: string }
): UrlMatchResult | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  // Use `.hostname` (no port) for consistent matching.
  const host = parsed.hostname
  const wantHost = entry.host
  let hostOk = false
  if (wantHost === host) {
    hostOk = true
  } else if (wantHost.startsWith('*.')) {
    hostOk = host.endsWith(wantHost.slice(1))
  }
  if (!hostOk) {
    return null
  }
  let pattern: RegExp
  try {
    pattern = new RegExp(entry.path)
  } catch {
    return null
  }
  const m = pattern.exec(parsed.pathname)
  if (m === null) {
    return null
  }
  return { groups: { ...(m.groups ?? {}) } }
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
      if (urlMatches(url, entry)) {
        return m
      }
    }
  }
  return null
}

/**
 * Find the first manifest+matched-entry pair for a URL, returning both the
 * manifest and the named capture groups. Used by parseUrl dispatch where
 * the host needs both "which manifest" and "what did the URL extract."
 */
export function findManifestMatchForUrl(
  manifests: readonly Manifest[],
  url: string
): { manifest: Manifest; groups: Record<string, string> } | null {
  for (const m of manifests) {
    for (const entry of m.urlMatch) {
      const match = matchUrl(url, entry)
      if (match !== null) {
        return { manifest: m, groups: match.groups }
      }
    }
  }
  return null
}
