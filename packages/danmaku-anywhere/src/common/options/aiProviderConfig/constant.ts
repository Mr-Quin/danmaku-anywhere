import type { AiProviderConfig } from './schema'

export const BUILT_IN_AI_PROVIDER_ID = 'built-in'

export const BUILT_IN_AI_PROVIDER: AiProviderConfig = {
  id: BUILT_IN_AI_PROVIDER_ID,
  isBuiltIn: true,
  name: 'Danmaku Anywhere AI',
  provider: 'built-in',
  enabled: true,
}
