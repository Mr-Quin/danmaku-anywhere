function fnv1a32(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    // Math.imul keeps this an exact 32-bit multiply; plain `*` overflows
    // MAX_SAFE_INTEGER and loses the low bits the hash depends on.
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function stripApiSuffix(pathname: string): string {
  return pathname.replace(/\/api\/?$/, '').replace(/\/$/, '')
}

// Key an instance by host + non-default port + path, ignoring scheme, so the
// same server keys the same as http or https. url.host drops 80/443 for free.
function normalizeBaseUrl(raw: string): string {
  const parse = (input: string): URL | undefined => {
    try {
      return new URL(input)
    } catch {
      return undefined
    }
  }

  // new URL('host:8080') reads `host:` as the scheme and loses the host, so
  // detect the scheme ourselves instead of relying on new URL() to throw.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
  const url = parse(hasScheme ? raw : `https://${raw}`)
  if (!url) {
    return raw
      .toLowerCase()
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '')
  }

  return `${url.host.toLowerCase()}${stripApiSuffix(url.pathname)}`
}

// URL-shaped values get URL semantics; anything else is compared as-is
// (tokens and the like can be case-sensitive, so no lowercasing).
function normalizeIdentityValue(field: string, value: unknown): string {
  if (typeof value !== 'string') {
    return JSON.stringify(value) ?? ''
  }
  const trimmed = value.trim()
  if (trimmed === '') {
    return ''
  }
  return field === 'baseUrl' ? normalizeBaseUrl(trimmed) : trimmed
}

/**
 * The content namespace a config's season/episode ids are valid in. The
 * manifest declares which config fields identify an instance (identityFields);
 * two configs whose declared values match share a namespace.
 *
 * A config whose id IS its manifestId is an auto-imported global instance
 * (e.g. the builtin DanDanPlay pointed at the proxy) and always keys to the
 * shared manifestId namespace, ahead of the declaration. A manifest declaring
 * no identity fields, or a config with all declared values blank, also keys
 * to manifestId.
 */
export function computeNamespaceKey(
  config: {
    id: string
    manifestId: string
    configValues?: Record<string, unknown>
  },
  identityFields: readonly string[]
): string {
  if (config.id === config.manifestId) {
    return config.manifestId
  }

  const pairs: string[] = []
  for (const field of [...identityFields].sort()) {
    const value = config.configValues?.[field]
    if (value === undefined || value === null) {
      continue
    }
    const normalized = normalizeIdentityValue(field, value)
    if (normalized === '') {
      continue
    }
    pairs.push(`${field}\u0000${normalized}`)
  }

  if (pairs.length === 0) {
    return config.manifestId
  }
  return `ns:${fnv1a32(pairs.join('\u0000'))}`
}
