import { md5 } from 'js-md5'
import { aesCbcDecrypt, aesCbcEncrypt } from './aes-cbc.js'
import { gatewayDecrypt } from './gateway-decrypt.js'
import { hmacSha256 } from './hmac.js'

/**
 * Closed namespace callable from JSONata as `$<name>(...)`. Helpers must be
 * pure; adding one needs an engine code change.
 */
export type Helper = (...args: unknown[]) => unknown

function hexToInt(hex: string): number {
  return Number.parseInt(hex.replace(/^0x/i, ''), 16)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function base64Encode(s: string): string {
  // Iterative (not `String.fromCharCode(...bytes)`) so large inputs don't
  // overflow the V8 argument limit (~65k spread args).
  const bytes = utf8Encode(s)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64Decode(s: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
  )
}

// Build a new string by reading `source` at each index in `indices`.
// Source-specific tables (e.g. Bilibili WBI's) live in manifests, not here.
function permute(indices: number[], source: string): string {
  let out = ''
  for (const i of indices) {
    if (i >= 0 && i < source.length) {
      out += source[i]
    }
  }
  return out
}

/** Sorted-by-key, URL-encoded `k=v&k=v` string. For URL query construction. */
function sortedQueryString(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort()
  return keys
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(obj[k] ?? ''))}`
    )
    .join('&')
}

/** Sorted-by-key, un-encoded `k=v` joined by `sep`. For sign-then-hash canonical forms. */
function sortedRawString(obj: Record<string, unknown>, sep = '&'): string {
  const keys = Object.keys(obj).sort()
  return keys.map((k) => `${k}=${obj[k] ?? ''}`).join(sep)
}

function regexExtract(
  input: string,
  pattern: string,
  group = 1
): string | null {
  const m = new RegExp(pattern).exec(input)
  return m ? (m[group] ?? null) : null
}

/** "HH:MM:SS" / "MM:SS" / "SS" → seconds. Returns 0 for unparseable input. */
function timeToSeconds(s: string): number {
  const parts = String(s)
    .split(':')
    .map((p) => Number(p))
  if (parts.some((p) => Number.isNaN(p))) return 0
  if (parts.length === 3) {
    const [h, m, sec] = parts as [number, number, number]
    return h * 3600 + m * 60 + sec
  }
  if (parts.length === 2) {
    const [m, sec] = parts as [number, number]
    return m * 60 + sec
  }
  return parts[0] ?? 0
}

/** Parse a JSON-encoded string. Returns null on parse error (manifests should
 * use ` ? : ` to default when a field is sometimes JSON-encoded, sometimes
 * already an object). */
function jsonParse(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

/** Strip `callback(...)` wrapper. Safe parse only — no eval. */
function jsonpUnwrap(input: string): unknown {
  const first = input.indexOf('(')
  const last = input.lastIndexOf(')')
  if (first < 0 || last <= first) {
    return JSON.parse(input)
  }
  return JSON.parse(input.substring(first + 1, last))
}

export const helpers: Record<string, Helper> = {
  // crypto
  md5: (s) => md5(String(s)),
  gatewayDecrypt: (s, k) => gatewayDecrypt(String(s), String(k)),
  aesCbcEncrypt: (pt, k, iv) =>
    aesCbcEncrypt(String(pt), String(k), String(iv)),
  aesCbcDecrypt: (ct, k, iv, padding) =>
    aesCbcDecrypt(
      String(ct),
      String(k),
      String(iv),
      padding === 'none' ? 'none' : 'pkcs7'
    ),
  hmacSha256: (m, k) => hmacSha256(String(m), String(k)),

  // codec
  base64Encode: (s) => base64Encode(String(s)),
  base64Decode: (s) => base64Decode(String(s)),
  hexToInt: (s) => hexToInt(String(s)),
  bytesToHex: (b) => bytesToHex(b as Uint8Array),

  // text
  regexExtract: (s, pattern, group) =>
    regexExtract(
      String(s),
      String(pattern),
      typeof group === 'number' ? group : 1
    ),
  jsonParse: (s) => jsonParse(String(s)),
  jsonpUnwrap: (s) => jsonpUnwrap(String(s)),
  timeToSeconds: (s) => timeToSeconds(String(s)),

  // query / signing
  sortedQueryString: (obj) => sortedQueryString(obj as Record<string, unknown>),
  sortedRawString: (obj, sep) =>
    sortedRawString(
      obj as Record<string, unknown>,
      typeof sep === 'string' ? sep : '&'
    ),

  // structural
  permute: (indices, source) => permute(indices as number[], String(source)),

  // misc
  now: () => Math.floor(Date.now() / 1000),
  millis: () => Date.now(),
  /** JSON.stringify; needed for signature flows where a payload is hashed before being sent. */
  stringify: (v) => JSON.stringify(v),
  range: (start, end) => {
    const s = Number(start)
    const e = end === undefined ? s : Number(end)
    const lo = end === undefined ? 0 : s
    const hi = e
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
    if (hi <= lo) return []
    // 10k hard cap — guards against a manifest typo like $range(0, 1e9).
    const len = Math.min(hi - lo, 10_000)
    return Array.from({ length: len }, (_, i) => lo + i)
  },
}
