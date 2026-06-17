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

export function computeNamespaceKey(config: {
  id: string
  manifestId: string
  configValues?: Record<string, unknown>
}): string {
  if (config.id === config.manifestId) {
    return config.manifestId
  }

  const rawBaseUrl = config.configValues?.['baseUrl']
  if (typeof rawBaseUrl !== 'string' || rawBaseUrl.trim() === '') {
    return config.manifestId
  }

  const normalized = normalizeBaseUrl(rawBaseUrl.trim())
  return `ns:${fnv1a32(normalized)}`
}
