import { z } from 'zod'
import {
  AI_PROVIDER_MAP,
  zAiProviderType,
} from '@/common/options/aiProviderConfig/AiProviderType'
import type { Options } from '@/common/options/OptionsService/types'
import { getRandomUUID } from '@/common/utils/utils'

const zAiProviderBaseConfig = z.object({
  id: z.string().default(getRandomUUID()),
  isBuiltIn: z.boolean().default(false),
  name: z.string().min(1),
  enabled: z.boolean(),
  provider: zAiProviderType,
})

const zAiProviderBuiltIn = zAiProviderBaseConfig.extend({
  provider: z.enum([AI_PROVIDER_MAP.builtIn]),
})

const zAiProviderOpenaiCompatible = zAiProviderBaseConfig.extend({
  provider: z.enum([AI_PROVIDER_MAP.openaiCompatible]),
  settings: z.object({
    baseUrl: z.string(),
    apiKey: z.string().optional(),
    model: z.string(),
    headers: z.record(z.string()).optional(),
    queryParams: z.record(z.string()).optional(),
    // values should be valid JSON
    providerOptions: z
      .record(
        z.string().refine(
          (value) => {
            try {
              JSON.parse(value)
              return true
            } catch {
              return false
            }
          },
          {
            message: 'Invalid JSON',
          }
        )
      )
      .optional(),
  }),
})

export const zAiProviderConfig = z.discriminatedUnion('provider', [
  zAiProviderBuiltIn,
  zAiProviderOpenaiCompatible,
])

export type AiProviderConfigInput = z.input<typeof zAiProviderConfig>
export type AiProviderConfig = z.infer<typeof zAiProviderConfig>
export type AiProviderConfigOptions = Options<AiProviderConfig[]>
