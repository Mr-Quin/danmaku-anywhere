const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return ''
  }
  const diff = Date.now() - then
  if (diff < MINUTE) {
    return 'just now'
  }
  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)}m ago`
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)}h ago`
  }
  const days = Math.floor(diff / DAY)
  if (days < 30) {
    return `${days}d ago`
  }
  return formatAbsolute(iso)
}
