import { md5 } from 'js-md5'

/**
 * Closed namespace of helpers callable from JSONata expressions as $<name>(...).
 * Adding a helper requires an engine code change — manifests cannot register
 * arbitrary code. Every helper must be a pure function.
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
  /**
   * Iterative concatenation rather than `String.fromCharCode(...bytes)`.
   * Spreading a long Uint8Array as function args overflows the call stack
   * (V8 argument limit is ~65k). Manifests may feed arbitrary upstream
   * strings into this helper.
   */
  const bytes = utf8Encode(s)
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary)
}

function base64Decode(s: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
  )
}

/**
 * Generic positional permutation: build a new string by reading `source` at
 * each index in `indices`. Out-of-range indices are skipped. Source-specific
 * permutation tables (e.g. Bilibili WBI) live in the manifest, not the engine.
 */
function permute(indices: number[], source: string): string {
  let out = ''
  for (const i of indices) {
    if (i >= 0 && i < source.length) {
      out += source[i]
    }
  }
  return out
}

/** Build a sorted, URL-encoded query string from an object. For request URLs. */
function sortedQueryString(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort()
  return keys
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(obj[k] ?? ''))}`
    )
    .join('&')
}

/**
 * Build a sorted, RAW (no URL encoding) string from an object. For signing
 * canonical forms — many upstreams hash the un-encoded representation.
 */
function sortedRawString(obj: Record<string, unknown>, sep = '&'): string {
  const keys = Object.keys(obj).sort()
  return keys.map((k) => `${k}=${obj[k] ?? ''}`).join(sep)
}

/**
 * Length caps to mitigate ReDoS. Promise.race-based timeouts can't preempt
 * synchronous regex backtracking in V8/SpiderMonkey, so the practical defense
 * is bounding pattern complexity and input size at the call site.
 */
const REGEX_MAX_PATTERN_LENGTH = 256
const REGEX_MAX_INPUT_LENGTH = 64 * 1024

function regexExtract(
  input: string,
  pattern: string,
  group = 1
): string | null {
  if (pattern.length > REGEX_MAX_PATTERN_LENGTH) {
    throw new Error(
      `$regexExtract: pattern exceeds ${REGEX_MAX_PATTERN_LENGTH} chars`
    )
  }
  if (input.length > REGEX_MAX_INPUT_LENGTH) {
    throw new Error(
      `$regexExtract: input exceeds ${REGEX_MAX_INPUT_LENGTH} chars`
    )
  }
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
  range: (start, end) => {
    const s = Number(start)
    const e = end === undefined ? s : Number(end)
    const lo = end === undefined ? 0 : s
    const hi = e
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
    if (hi <= lo) return []
    /** Cap to prevent runaway loops in a misbehaving manifest. */
    const len = Math.min(hi - lo, 10_000)
    return Array.from({ length: len }, (_, i) => lo + i)
  },
}
