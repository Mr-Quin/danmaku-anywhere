import { z } from 'zod'
import type { Options } from '@/common/options/OptionsService/types'

// Flat shape: per-source quirks live in `configValues` validated by the
// manifest's `configSchema`. The host doesn't need to know what fields are
// valid, that's the manifest's job. The provider tag is derived from
// `manifestId` on read (providerTypeFromManifestId), not persisted.
export const providerConfigSchema = z.object({
  id: z.string(),
  manifestId: z.string(),
  name: z.string().min(1),
  enabled: z.boolean(),
  configValues: z.record(z.string(), z.unknown()),
})

export type ProviderConfig = z.infer<typeof providerConfigSchema>

export type ProviderConfigOptions = Options<ProviderConfig[]>
