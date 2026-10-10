import { z } from 'zod'
import {
  AI_PROVIDER_MAP,
  zAiProviderType,
} from '@/common/options/aiProviderConfig/AiProviderType'
import type { Options } from '@/common/options/OptionsService/types'
import { getRandomUUID } from '@/common/utils/utils'

const zAiProviderBaseConfig = z.object({
  id: z.string().default(() => getRandomUUID()),
  isBuiltIn: z.boolean().default(false),
  name: z.string().min(1),
  enabled: z.boolean(),
  provider: zAiProviderType,
})

const zAiProviderBuiltIn = zAiProviderBaseConfig.extend({
  provider: z.enum([AI_PROVIDER_MAP.builtIn]),
})

const zOpenaiCompatibleSettings = z.object({
  baseUrl: z.string(),
  apiKey: z.string().optional(),
  model: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
})

const zAiProviderOpenaiCompatible = zAiProviderBaseConfig.extend({
  provider: z.enum([AI_PROVIDER_MAP.openaiCompatible]),
  settings: zOpenaiCompatibleSettings.extend({
    // values should be valid JSON
    providerOptions: z
      .record(
        z.string(),
        z
          .string()
          .refine(
            (value) => {
              try {
                JSON.parse(value)
                return true
              } catch {
                return false
              }
            },
            {
              error: 'Invalid JSON',
            }
          )
          .transform((value) => JSON.parse(value))
      )
      .optional(),
  }),
})

export const zAiProviderConfig = z.discriminatedUnion('provider', [
  zAiProviderBuiltIn,
  zAiProviderOpenaiCompatible,
])

const zStoredIdentity = {
  id: z.string(),
  isBuiltIn: z.boolean(),
}

// Stored providerOptions are already parsed, so they cannot go back through
// the input schema.
export const zStoredAiProviderConfig = z.discriminatedUnion('provider', [
  zAiProviderBuiltIn.extend(zStoredIdentity),
  zAiProviderOpenaiCompatible.extend({
    ...zStoredIdentity,
    settings: zOpenaiCompatibleSettings.extend({
      providerOptions: z.record(z.string(), z.json()).optional(),
    }),
  }),
])

export type AiProviderConfigInput = z.input<typeof zAiProviderConfig>
export type AiProviderConfig = z.infer<typeof zAiProviderConfig>
export type AiProviderConfigOptions = Options<AiProviderConfig[]>
