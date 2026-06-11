function fnv1a32(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '')
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
