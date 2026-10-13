export function withUrlScheme(text: string): string {
  const trimmed = text.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

export function isHttpLink(text: string): boolean {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return false
  }
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
  return isHttp && url.hostname !== ''
}
