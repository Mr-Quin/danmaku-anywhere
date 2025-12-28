import { z } from 'zod'
import type { Options } from '@/common/options/OptionsService/types'
import { getRandomUUID } from '@/common/utils/utils'

export enum AiProviderType {
  BuiltIn = 'BuiltIn',
  OpenAI = 'OpenAI',
  OpenAICompatible = 'OpenAICompatible',
  Custom = 'Custom',
}

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
  }),
})

export type AiProviderConfig = z.infer<typeof zAiProviderConfig>
export type AiProviderConfigOptions = Options<AiProviderConfig[]>
