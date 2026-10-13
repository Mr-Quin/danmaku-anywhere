import { LATEST_INTEGRATION_POLICY_VERSION } from './integrationPolicyStore/version'
import { LATEST_MOUNT_CONFIG_VERSION } from './mountConfig/version'

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
  latestVersion: 27,
} as const satisfies OptionStoreDescriptor

export const danmakuOptionsDescriptor = {
  key: 'danmakuOptions',
  area: 'sync',
  latestVersion: 10,
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
  latestVersion: 5,
} as const satisfies OptionStoreDescriptor

export const aiProviderConfigDescriptor = {
  key: 'aiProviderConfig',
  area: 'sync',
  latestVersion: 1,
} as const satisfies OptionStoreDescriptor

export const searchHistoryDescriptor = {
  key: 'searchHistory',
  area: 'local',
  latestVersion: 1,
} as const satisfies OptionStoreDescriptor

export const namingRuleDescriptor = {
  key: 'localMatchingRule',
  area: 'local',
  latestVersion: 1,
} as const satisfies OptionStoreDescriptor

export const userAuthDescriptor = {
  key: 'userAuth',
  area: 'local',
  latestVersion: 1,
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
