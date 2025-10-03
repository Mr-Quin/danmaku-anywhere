import type { ProviderConfigType } from './schema'

export function localizeProviderConfigType(type: ProviderConfigType): string {
  return `providers.type.${type}`
}
