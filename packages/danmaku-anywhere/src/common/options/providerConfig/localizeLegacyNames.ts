import { LEGACY_BUILTIN_NAMES } from './migration'
import type { ProviderConfig } from './schema'

// Releases before the manifest catalog stored built-in names as fixed English
// literals the user could not edit, so a built-in still carrying exactly that
// name was never renamed by its user. Those take the manifest display name a
// fresh install would have seeded. Returns the input array when nothing changes.
export function localizeLegacyBuiltinNames(
  configs: ProviderConfig[],
  manifestNames: ReadonlyMap<string, string>
): ProviderConfig[] {
  let changed = false
  const out = configs.map((config) => {
    if (config.id !== config.manifestId) {
      return config
    }
    if (LEGACY_BUILTIN_NAMES[config.id] !== config.name) {
      return config
    }
    const name = manifestNames.get(config.manifestId)
    if (name === undefined || name === config.name) {
      return config
    }
    changed = true
    return { ...config, name }
  })
  return changed ? out : configs
}
