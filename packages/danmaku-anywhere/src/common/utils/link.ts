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

// A link the user plainly meant as one. Other text that only looks like a link,
// such as "Re.Zero/2", is a title unless a source reads it.
export function isExplicitLink(text: string): boolean {
  const trimmed = text.trim()
  return (
    isLink(trimmed) && (HTTP_SCHEME.test(trimmed) || /^www\./i.test(trimmed))
  )
}
