import type { ProviderConfig } from './schema'

function baseUrlHost(config: ProviderConfig): string | undefined {
  const { baseUrl } = config.configValues
  if (typeof baseUrl !== 'string') {
    return undefined
  }
  try {
    return new URL(baseUrl).host
  } catch {
    return undefined
  }
}

// Display name per config id. Configs of one manifest can share a name (a
// self-hosted DanDanPlay is often still called after the built-in), so a name
// that is not unique gets the server host, except on the built-in itself.
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
    const host = baseUrlHost(config)
    if (shared && config.id !== config.manifestId && host !== undefined) {
      names.set(config.id, `${config.name} (${host})`)
    } else {
      names.set(config.id, config.name)
    }
  }
  return names
}
