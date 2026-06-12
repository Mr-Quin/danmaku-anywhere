export function seasonSourceKey(season: {
  manifestId?: string
  indexedId: string
}): string {
  return `${season.manifestId ?? 'unknown'}`
}
