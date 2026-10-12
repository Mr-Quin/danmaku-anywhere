import { i18n } from '@/common/localization/i18n'
import { BUILT_IN_AI_PROVIDER_ID } from './constant'
import type { AiProviderConfig } from './schema'

export function aiProviderDisplayName(
  config: Pick<AiProviderConfig, 'id' | 'name'>
): string {
  if (config.id === BUILT_IN_AI_PROVIDER_ID) {
    return i18n.t('ai.builtInName', 'Danmaku Anywhere AI')
  }
  return config.name
}
