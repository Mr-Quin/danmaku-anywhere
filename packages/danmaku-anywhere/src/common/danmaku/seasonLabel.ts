export function seasonSourceKey(season: {
  manifestId?: string
  providerConfigId?: string
  indexedId: string
}): string {
  return `${season.manifestId ?? season.providerConfigId ?? 'unknown'}`
}
