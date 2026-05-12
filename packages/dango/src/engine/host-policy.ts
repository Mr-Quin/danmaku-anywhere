/**
 * Block hosts that resolve to local / private / link-local addresses. This is
 * a SSRF mitigation, not a guarantee — DNS-level rebinding can still resolve
 * a public hostname to a private IP at request time. The host's `FetchLike`
 * is the right place to enforce a deeper check if needed (e.g. by resolving
 * DNS and re-validating).
 *
 * Patterns enforced:
 *   - localhost, *.localhost, *.local
 *   - 127.x.x.x (loopback)
 *   - 10.x.x.x, 192.168.x.x, 172.16-31.x.x (private)
 *   - 169.254.x.x (link-local)
 *   - 0.0.0.0
 *   - [::1], [::], fc00::/7 (IPv6 loopback / private)
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::', '::1'])

function isPrivateIPv4(host: string): boolean {
  /** Match 4-octet numeric strings only. Anything with letters is a hostname. */
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const [, a, b] = m.map(Number) as [number, number, number, number, number]
  if (a === 127 || a === 10 || a === 0) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

function isPrivateIPv6Literal(host: string): boolean {
  /**
   * URL hosts wrap IPv6 in []; strip them. Then reject loopback (::1, ::) and
   * unique-local (fc00::/7 — first hextet starts with fc or fd).
   */
  const inner = host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase()
  if (inner === '::1' || inner === '::' || inner === '0:0:0:0:0:0:0:1') {
    return true
  }
  if (/^fc[0-9a-f]{2}:/.test(inner) || /^fd[0-9a-f]{2}:/.test(inner)) {
    return true
  }
  if (/^fe[89ab][0-9a-f]:/.test(inner)) {
    /** Link-local fe80::/10 */
    return true
  }
  return false
}

/**
 * Returns true if `host` is a literal local/private address or hostname that
 * MUST resolve locally (localhost, *.local). For request-time URL validation.
 */
export function isPrivateOrLocalHost(host: string): boolean {
  const lower = host.toLowerCase()
  if (LOCAL_HOSTNAMES.has(lower)) return true
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true
  if (lower.endsWith('.local')) return true
  if (isPrivateIPv4(lower)) return true
  if (isPrivateIPv6Literal(lower)) return true
  return false
}

/**
 * Validate a manifest's hosts array entry at load time. Each entry is either
 * an exact host (`api.example.com`), a leading-wildcard (`*.example.com`),
 * or the literal `*` (reserved for templates with config-supplied hosts).
 *
 * Rejects entries that name a local/private address directly. Wildcards that
 * could match a local address (`*.localhost`, `*.local`) are also rejected.
 */
export function validateHostPattern(pattern: string): void {
  if (pattern === '*') return
  const concreteHost = pattern.startsWith('*.') ? pattern.slice(2) : pattern
  if (!concreteHost) {
    throw new Error(`invalid host pattern: "${pattern}"`)
  }
  if (isPrivateOrLocalHost(concreteHost)) {
    throw new Error(
      `host pattern "${pattern}" resolves to a local/private address`
    )
  }
  /** A bare `*.local` strips to `local` which fails the above; defense-in-depth: */
  if (pattern.endsWith('.local') || pattern.endsWith('.localhost')) {
    throw new Error(`host pattern "${pattern}" matches a local namespace`)
  }
}
