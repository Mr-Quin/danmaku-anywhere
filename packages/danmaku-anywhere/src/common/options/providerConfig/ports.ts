import type { ConfigSchema } from '@mr-quin/dango'
import type { SourceUnavailableReason } from '@/common/errors/AppError'

// Whether a source's manifest can run here. Only a manifest that loaded has a
// configSchema to check settings against.
export type ManifestAvailability =
  | { status: 'ok'; configSchema: ConfigSchema | undefined }
  | { status: 'unavailable'; reason: SourceUnavailableReason }

export interface IConfigSchemaSource {
  find(manifestId: string): Promise<ManifestAvailability>
}

export const ConfigSchemaSourceSymbol = Symbol.for('ConfigSchemaSource')

export interface IProviderConfigCleanup {
  beforeDelete(providerConfigId: string): Promise<void>
}

export const ProviderConfigCleanupSymbol = Symbol.for('ProviderConfigCleanup')
