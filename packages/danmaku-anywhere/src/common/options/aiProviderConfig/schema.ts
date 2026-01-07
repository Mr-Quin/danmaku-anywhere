import { z } from 'zod'
import { AiProviderType } from '@/common/options/aiProviderConfig/AiProviderType'
import type { Options } from '@/common/options/OptionsService/types'
import { getRandomUUID } from '@/common/utils/utils'

const zAiProviderType = z.nativeEnum(AiProviderType)

export const zAiProviderConfig = z.object({
  id: z.string().default(getRandomUUID()),
  isBuiltIn: z.boolean().default(false),
  name: z.string().min(1),
  enabled: z.boolean(),
  provider: zAiProviderType,
  settings: z.object({
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string().optional(),
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

export type AiProviderConfigInput = z.input<typeof zAiProviderConfig>
export type AiProviderConfig = z.infer<typeof zAiProviderConfig>
export type AiProviderConfigOptions = Options<AiProviderConfig[]>
