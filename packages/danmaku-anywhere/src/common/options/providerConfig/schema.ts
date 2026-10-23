import { z } from 'zod'
import type { Options } from '@/common/options/OptionsService/types'

// Per-source settings live in `configValues`, checked against the manifest's
// `configSchema` when written. The provider tag is derived from `manifestId`
// on read (providerTypeFromManifestId), not persisted.
export const providerConfigSchema = z.object({
  id: z.string(),
  manifestId: z.string(),
  // null shows the source's default name, which follows the UI language
  customName: z.string().trim().min(1).nullable(),
  enabled: z.boolean(),
  configValues: z.record(z.string(), z.unknown()),
})

export type ProviderConfig = z.infer<typeof providerConfigSchema>

export type ProviderConfigOptions = Options<ProviderConfig[]>

// A source about to be added; the background assigns its id.
export type ProviderConfigDraft = Omit<ProviderConfig, 'id'>

// What an edit can change. id and manifestId are fixed for the life of a
// config, and enabled has its own operation.
export type ProviderConfigEdit = Partial<
  Pick<ProviderConfig, 'customName' | 'configValues'>
>
