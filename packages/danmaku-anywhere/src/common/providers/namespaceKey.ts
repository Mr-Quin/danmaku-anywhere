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

function normalizeBaseUrl(raw: string): string {
  // Hostnames are case-insensitive, so lowercase before hashing or two
  // differently-cased URLs for one server would key to different namespaces.
  return raw
    .toLowerCase()
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '')
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
