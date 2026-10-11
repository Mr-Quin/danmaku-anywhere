import type { ProviderConfig } from '@/common/options/providerConfig/schema'

export function resolveSeasonConfig(
  season: { providerConfigId: string },
  configs: ProviderConfig[]
): ProviderConfig | undefined {
  return configs.find((config) => config.id === season.providerConfigId)
}
