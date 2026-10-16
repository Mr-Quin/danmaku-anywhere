// A server URL as the UI shows it next to a name: host and path, no scheme
export function serverLabel(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  try {
    const url = new URL(value)
    return `${url.host}${url.pathname.replace(/\/$/, '')}` || undefined
  } catch {
    return undefined
  }
}
