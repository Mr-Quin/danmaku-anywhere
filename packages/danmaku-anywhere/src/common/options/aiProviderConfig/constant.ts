import { type AiProviderConfig, AiProviderType } from './schema'

export const BUILT_IN_AI_PROVIDER_ID = 'built-in'

export const BUILT_IN_AI_PROVIDER: AiProviderConfig = {
  id: BUILT_IN_AI_PROVIDER_ID,
  isBuiltIn: true,
  name: 'Danmaku Anywhere AI',
  provider: AiProviderType.BuiltIn,
  enabled: true,
  settings: {},
}
