import { XMLParser } from 'fast-xml-parser'
import { helpers } from '../helpers/registry.js'
import type { RequestSpec } from '../manifest/schema.js'
import { isPrivateOrLocalHost } from './host-policy.js'
import { evalExpr, evalString } from './jsonata-eval.js'
import type { ProtoRegistry } from './proto.js'

export type FetchLike = (
  input: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
    credentials?: 'include' | 'omit'
    signal?: AbortSignal
    /**
     * Wire-level header rewrites the host should apply (e.g. via
     * chrome.declarativeNetRequest in the extension, or directly as headers
     * in a server context). The engine is agnostic to how this is implemented.
     */
    rewriteHeaders?: Record<string, string>
  }
) => Promise<{
  status: number
  text: () => Promise<string>
  /** Raw response body bytes. Used for `format: 'proto'`. */
  bytes: () => Promise<Uint8Array>
  headers: Map<string, string>
}>

export interface HttpRunOptions {
  fetcher?: FetchLike
  /** Hosts allowlist (manifest.hosts). Resolved URLs must match. */
  allowedHosts: string[]
  /**
   * Optional cancellation signal. If aborted, fetcher receives it and the
   * request is rejected.
   */
  signal?: AbortSignal
  /**
   * Maximum response body size in bytes. Defaults to 5MB. A malicious or
   * compromised upstream can otherwise return arbitrarily large bodies and
   * blow up memory.
   */
  maxResponseBytes?: number
  /** Required when any request uses `format: 'proto'`. */
  protoRegistry?: ProtoRegistry
}

const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024

function hostMatches(url: string, allowed: string[]): boolean {
  let host: string
  try {
    /**
     * `.hostname` (not `.host`) — strips port so `api.example.com:443` matches
     * the `api.example.com` allowlist entry, and so `127.0.0.1:8080` can't
     * sneak past the private-host check by appending a port.
     */
    host = new URL(url).hostname
  } catch {
    return false
  }
  return allowed.some((pattern) => {
    /**
     * `*` is the "match anything" wildcard reserved for DDP-Compat templates
     * where the host comes from per-installation config. The private-host
     * check in executeRequest still applies — this only opens the allowlist.
     */
    if (pattern === '*') return true
    if (pattern === host) return true
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1) // ".example.com"
      return host.endsWith(suffix)
    }
    return false
  })
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  trimValues: true,
})

function parseTextBody(format: string, raw: string): unknown {
  switch (format) {
    case 'json':
      return JSON.parse(raw)
    case 'xml':
      return xmlParser.parse(raw)
    case 'jsonp': {
      const jsonpUnwrap = helpers.jsonpUnwrap
      if (jsonpUnwrap === undefined) {
        throw new Error('jsonpUnwrap helper missing')
      }
      return jsonpUnwrap(raw)
    }
    case 'text':
      return raw
    default:
      throw new Error(`unknown format: ${format}`)
  }
}

const FORBIDDEN_HEADERS = new Set([
  'cookie',
  'set-cookie',
  'authorization',
  'host',
  'origin',
])

async function buildHeaders(
  spec: RequestSpec,
  context: unknown
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (!spec.headers) return out
  for (const [name, expr] of Object.entries(spec.headers)) {
    if (FORBIDDEN_HEADERS.has(name.toLowerCase())) {
      throw new Error(`header "${name}" not allowed in manifest`)
    }
    out[name] = await evalString(expr, context)
  }
  return out
}

async function buildRewriteHeaders(
  spec: RequestSpec,
  context: unknown
): Promise<Record<string, string> | undefined> {
  if (!spec.rewriteHeaders) return undefined
  const out: Record<string, string> = {}
  for (const [name, expr] of Object.entries(spec.rewriteHeaders)) {
    out[name] = await evalString(expr, context)
  }
  return out
}

async function buildUrl(spec: RequestSpec, context: unknown): Promise<string> {
  const base = await evalString(spec.url, context)
  if (!spec.query) return base
  const queryObj = await evalExpr(spec.query, context)
  if (queryObj === null || queryObj === undefined) return base
  if (typeof queryObj !== 'object') {
    throw new TypeError(
      `request.query must evaluate to an object, got ${typeof queryObj}`
    )
  }
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(queryObj as Record<string, unknown>)) {
    if (v === null || v === undefined) continue
    params.set(k, String(v))
  }
  const qs = params.toString()
  if (!qs) return base
  return base.includes('?') ? `${base}&${qs}` : `${base}?${qs}`
}

async function buildBody(
  spec: RequestSpec,
  context: unknown
): Promise<string | undefined> {
  if (!spec.body) return undefined
  const v = await evalExpr(spec.body, context)
  if (v === null || v === undefined) return undefined
  return typeof v === 'string' ? v : JSON.stringify(v)
}

export async function executeRequest(
  spec: RequestSpec,
  context: unknown,
  options: HttpRunOptions
): Promise<unknown> {
  const url = await buildUrl(spec, context)
  if (!hostMatches(url, options.allowedHosts)) {
    throw new Error(`URL host not in manifest.hosts allowlist: ${url}`)
  }
  /**
   * Defense-in-depth: re-validate the resolved URL host against the
   * local/private address policy. A templated URL or a `*` host (DDP-Compat)
   * could land on a private IP even if the allowlist would otherwise accept.
   */
  let resolvedHost: string
  try {
    resolvedHost = new URL(url).hostname
  } catch {
    throw new Error(`invalid URL produced by manifest: ${url}`)
  }
  if (isPrivateOrLocalHost(resolvedHost)) {
    throw new Error(
      `resolved URL host "${resolvedHost}" is a local/private address`
    )
  }
  const headers = await buildHeaders(spec, context)
  const rewriteHeaders = await buildRewriteHeaders(spec, context)
  const body = await buildBody(spec, context)
  const fetcher = options.fetcher ?? defaultFetcher
  const res = await fetcher(url, {
    method: spec.method,
    headers,
    body,
    credentials: spec.credentials,
    signal: options.signal,
    rewriteHeaders,
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  const cap = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES
  if (spec.format === 'proto') {
    if (options.protoRegistry === undefined) {
      throw new Error(
        `request specifies format: 'proto' but no protoRegistry was provided`
      )
    }
    if (spec.protoSchema === undefined || spec.protoMessage === undefined) {
      throw new Error(
        `format: 'proto' requires protoSchema and protoMessage fields`
      )
    }
    const bytes = await res.bytes()
    if (bytes.length > cap) {
      throw new Error(`response from ${url} exceeds maxResponseBytes (${cap})`)
    }
    return options.protoRegistry.decode(
      spec.protoSchema,
      spec.protoMessage,
      bytes
    )
  }
  const text = await res.text()
  /**
   * `text.length` counts UTF-16 code units, not bytes. For our cap-purpose
   * use it as a conservative byte proxy — a non-ASCII string with N code
   * units is at most 4N bytes, so `text.length > cap` is a strict bound on
   * UTF-8 size. We don't need exact byte counts to enforce a memory ceiling.
   */
  if (text.length > cap) {
    throw new Error(`response from ${url} exceeds maxResponseBytes (${cap})`)
  }
  return parseTextBody(spec.format, text)
}

const defaultFetcher: FetchLike = async (input, init) => {
  const res = await fetch(input, init as RequestInit)
  const headers = new Map<string, string>()
  res.headers.forEach((v, k) => headers.set(k, v))
  return {
    status: res.status,
    text: () => res.text(),
    bytes: async () => new Uint8Array(await res.arrayBuffer()),
    headers,
  }
}

export class AbortedError extends Error {
  constructor() {
    super('aborted')
    this.name = 'AbortedError'
  }
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new AbortedError()
  }
}
