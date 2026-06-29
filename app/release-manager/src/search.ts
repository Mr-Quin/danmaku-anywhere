export function matchesQuery(
  query: string,
  tag: string,
  version: string
): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }
  return (
    tag.toLowerCase().includes(needle) || version.toLowerCase().includes(needle)
  )
}
