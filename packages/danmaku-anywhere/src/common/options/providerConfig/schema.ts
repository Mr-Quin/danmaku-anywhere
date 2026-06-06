import { z } from 'zod'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { Options } from '@/common/options/OptionsService/types'

// Flat shape: per-source quirks live in `configValues` validated by the
// manifest's `configSchema`. The host doesn't need to know what fields are
// valid — that's the manifest's job.
export const providerConfigSchema = z.object({
  id: z.string(),
  manifestId: z.string(),
  impl: z.enum(DanmakuSourceType),
  name: z.string().min(1),
  // Deprecated: there is no built-in concept anymore, the seeded defaults are
  // ordinary auto-imported configs. Kept optional so stored data still parses;
  // nothing reads it.
  isBuiltIn: z.boolean().optional(),
  enabled: z.boolean(),
  configValues: z.record(z.string(), z.unknown()),
})

export type ProviderConfig = z.infer<typeof providerConfigSchema>

export type ProviderConfigOptions = Options<ProviderConfig[]>
