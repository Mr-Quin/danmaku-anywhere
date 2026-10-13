import { isBuiltinConfig } from './builtin'
import type { ProviderConfig } from './schema'

// Manifest names keyed by manifest id, in the language the names are shown in
export type ManifestNames = ReadonlyMap<string, string>

type NamedConfig = Pick<ProviderConfig, 'manifestId' | 'customName'> & {
  id?: string
}

export function defaultSourceName(
  config: Pick<ProviderConfig, 'manifestId'>,
  manifestNames: ManifestNames
): string {
  return manifestNames.get(config.manifestId) ?? config.manifestId
}

export function sourceName(
  config: NamedConfig,
  manifestNames: ManifestNames
): string {
  return config.customName ?? defaultSourceName(config, manifestNames)
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

// Display name per config id. Configs that end up with the same name are told
// apart by their server, since a self-hosted DanDanPlay usually keeps the
// default name.
export function sourceDisplayNames(
  configs: readonly ProviderConfig[],
  manifestNames: ManifestNames
): Map<string, string> {
  const baseNames = new Map(
    configs.map((config) => [config.id, sourceName(config, manifestNames)])
  )
  const nameCounts = new Map<string, number>()
  for (const name of baseNames.values()) {
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
  }
  const names = new Map<string, string>()
  for (const config of configs) {
    const name = baseNames.get(config.id) ?? config.manifestId
    const shared = (nameCounts.get(name) ?? 0) > 1
    const server = serverLabel(config)
    if (shared && !isBuiltinConfig(config) && server !== undefined) {
      names.set(config.id, `${name} (${server})`)
    } else {
      names.set(config.id, name)
    }
  }
  return names
}
