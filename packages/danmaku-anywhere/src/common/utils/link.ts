const HTTP_SCHEME = /^https?:\/\//i

export function withUrlScheme(text: string): string {
  const trimmed = text.trim()
  if (HTTP_SCHEME.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

// Text typed without a scheme only counts when it carries a dotted host and a
// path, so a title such as "Dr.STONE" stays a search.
export function isLink(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed === '' || /\s/.test(trimmed)) {
    return false
  }
  let url: URL
  try {
    url = new URL(withUrlScheme(trimmed))
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false
  }
  if (HTTP_SCHEME.test(trimmed)) {
    return url.hostname !== ''
  }
  return url.hostname.includes('.') && trimmed.includes('/')
}
