import type { ConfigSchema } from '@mr-quin/dango'
import type { SourceUnavailableReason } from '@/common/errors/AppError'

// Whether a source's manifest can run here. Only a manifest that loaded has a
// configSchema to check settings against. `fallback` is set when the bundled
// copy runs in place of a stored one this build cannot run, so its schema may
// not be the one the stored settings were written for.
export type ManifestAvailability =
  | { status: 'ok'; configSchema: ConfigSchema | undefined; fallback: boolean }
  | { status: 'unavailable'; reason: SourceUnavailableReason }

export interface IConfigSchemaSource {
  find(manifestId: string): Promise<ManifestAvailability>
}

export const ConfigSchemaSourceSymbol = Symbol.for('ConfigSchemaSource')

export interface IProviderConfigCleanup {
  beforeDelete(providerConfigId: string): Promise<void>
}

export const ProviderConfigCleanupSymbol = Symbol.for('ProviderConfigCleanup')
