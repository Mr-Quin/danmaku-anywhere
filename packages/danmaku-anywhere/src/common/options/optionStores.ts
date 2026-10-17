import { LATEST_AI_PROVIDER_CONFIG_VERSION } from './aiProviderConfig/version'
import { LATEST_DANMAKU_OPTIONS_VERSION } from './danmakuOptions/version'
import { LATEST_EXTENSION_OPTIONS_VERSION } from './extensionOptions/version'
import { LATEST_INTEGRATION_POLICY_VERSION } from './integrationPolicyStore/version'
import { LATEST_NAMING_RULE_VERSION } from './localMatchingRule/version'
import { LATEST_MOUNT_CONFIG_VERSION } from './mountConfig/version'
import { LATEST_PROVIDER_CONFIG_VERSION } from './providerConfig/version'
import { LATEST_SEARCH_HISTORY_VERSION } from './searchHistory/version'
import { LATEST_USER_AUTH_VERSION } from './userAuth/version'

// Where an option store lives and the version its data must reach. Pure data,
// so a frame can check readiness without constructing any store service.
export interface OptionStoreDescriptor {
  readonly key: string
  readonly area: 'sync' | 'local'
  readonly latestVersion: number
}

export const extensionOptionsDescriptor = {
  key: 'extensionOptions',
  area: 'sync',
  latestVersion: LATEST_EXTENSION_OPTIONS_VERSION,
} as const satisfies OptionStoreDescriptor

export const danmakuOptionsDescriptor = {
  key: 'danmakuOptions',
  area: 'sync',
  latestVersion: LATEST_DANMAKU_OPTIONS_VERSION,
} as const satisfies OptionStoreDescriptor

export const integrationPolicyDescriptor = {
  key: 'xpathPolicy',
  area: 'local',
  latestVersion: LATEST_INTEGRATION_POLICY_VERSION,
} as const satisfies OptionStoreDescriptor

export const mountConfigDescriptor = {
  key: 'mountConfig',
  area: 'sync',
  latestVersion: LATEST_MOUNT_CONFIG_VERSION,
} as const satisfies OptionStoreDescriptor

export const providerConfigDescriptor = {
  key: 'providerConfig',
  area: 'sync',
  latestVersion: LATEST_PROVIDER_CONFIG_VERSION,
} as const satisfies OptionStoreDescriptor

export const aiProviderConfigDescriptor = {
  key: 'aiProviderConfig',
  area: 'sync',
  latestVersion: LATEST_AI_PROVIDER_CONFIG_VERSION,
} as const satisfies OptionStoreDescriptor

export const searchHistoryDescriptor = {
  key: 'searchHistory',
  area: 'local',
  latestVersion: LATEST_SEARCH_HISTORY_VERSION,
} as const satisfies OptionStoreDescriptor

export const namingRuleDescriptor = {
  key: 'localMatchingRule',
  area: 'local',
  latestVersion: LATEST_NAMING_RULE_VERSION,
} as const satisfies OptionStoreDescriptor

export const userAuthDescriptor = {
  key: 'userAuth',
  area: 'local',
  latestVersion: LATEST_USER_AUTH_VERSION,
} as const satisfies OptionStoreDescriptor

export const OPTION_STORES: readonly OptionStoreDescriptor[] = [
  extensionOptionsDescriptor,
  danmakuOptionsDescriptor,
  integrationPolicyDescriptor,
  mountConfigDescriptor,
  providerConfigDescriptor,
  aiProviderConfigDescriptor,
  searchHistoryDescriptor,
  namingRuleDescriptor,
  userAuthDescriptor,
]

export const OptionStoreDescriptors = Symbol.for('OptionStoreDescriptors')
