import type { ProviderConfig } from './schema'

// A user's own server can point at the hosted proxy URL too, so the built-in
// is told by its identity, never by its base URL.
export function isBuiltinConfig(
  config: Pick<ProviderConfig, 'id' | 'manifestId'>
): boolean {
  return config.id === config.manifestId
}

function serverLabel(config: ProviderConfig): string | undefined {
  const { baseUrl } = config.configValues
  if (typeof baseUrl !== 'string') {
    return undefined
  }
  try {
    const url = new URL(baseUrl)
    return `${url.host}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return undefined
  }
}

// Display name per config id. Same-named configs must be told apart, and a
// self-hosted DanDanPlay is often still named after the built-in.
export function providerDisplayNames(
  configs: ProviderConfig[]
): Map<string, string> {
  const nameCounts = new Map<string, number>()
  for (const config of configs) {
    nameCounts.set(config.name, (nameCounts.get(config.name) ?? 0) + 1)
  }
  const names = new Map<string, string>()
  for (const config of configs) {
    const shared = (nameCounts.get(config.name) ?? 0) > 1
    const server = serverLabel(config)
    if (shared && !isBuiltinConfig(config) && server !== undefined) {
      names.set(config.id, `${config.name} (${server})`)
    } else {
      names.set(config.id, config.name)
    }
  }
  return names
}
