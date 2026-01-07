import z from 'zod'
import { i18n } from '@/common/localization/i18n'
import { createLocalizationMap } from '@/common/utils/createLocalizationMap'

export const AI_PROVIDER_LIST = ['openai-compatible', 'built-in'] as const

export const zAiProviderType = z.enum(['openai-compatible', 'built-in'])

export type AiProviderType = z.infer<typeof zAiProviderType>

export const AI_PROVIDER_MAP = {
  openaiCompatible: 'openai-compatible',
  builtIn: 'built-in',
} satisfies Record<string, AiProviderType>

const AI_PROVIDER_TYPE_LABELS = createLocalizationMap<AiProviderType>({
  'openai-compatible': () =>
    i18n.t('ai.providerType.openAICompatible', 'OpenAI Compatible'),
  'built-in': () => i18n.t('ai.providerType.builtIn', 'Built-in'),
})

export function localizedAiProviderType(type: AiProviderType): string {
  return AI_PROVIDER_TYPE_LABELS[type]()
}
