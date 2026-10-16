import type { ConfigSchema } from '@mr-quin/dango'

export interface IConfigSchemaSource {
  // Undefined when no manifest with this id is installed
  find(
    manifestId: string
  ): Promise<{ configSchema: ConfigSchema | undefined } | undefined>
}

export const ConfigSchemaSourceSymbol = Symbol.for('ConfigSchemaSource')

export interface IProviderConfigCleanup {
  beforeDelete(providerConfigId: string): Promise<void>
}

export const ProviderConfigCleanupSymbol = Symbol.for('ProviderConfigCleanup')
