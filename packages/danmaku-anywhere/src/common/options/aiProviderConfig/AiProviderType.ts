import { i18n } from '@/common/localization/i18n'
import { createLocalizationMap } from '@/common/utils/createLocalizationMap'

export enum AiProviderType {
  BuiltIn = 'BuiltIn',
  OpenAICompatible = 'OpenAICompatible',
}

const AI_PROVIDER_TYPE_LABELS = createLocalizationMap<AiProviderType>({
  [AiProviderType.BuiltIn]: () => i18n.t('ai.providerType.builtIn', 'Built-in'),
  [AiProviderType.OpenAICompatible]: () =>
    i18n.t('ai.providerType.openAICompatible', 'OpenAI Compatible'),
})

export function localizedAiProviderType(type: AiProviderType): string {
  return AI_PROVIDER_TYPE_LABELS[type]()
}

export const AI_PROVIDER_LIST = Object.values(AiProviderType)
