import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import { isNetworkError } from '@/common/utils/networkError'

const HTTP_FAILURE = /\bHTTP \d{3}\b|Request failed with status \d{3}/

// Errors cross the RPC boundary as plain Errors with the original attached as
// `cause`, and the provider's error can be wrapped again inside that.
export function isUnreachableError(error: unknown): boolean {
  let current = error
  for (let depth = 0; depth < 5; depth++) {
    if (!(current instanceof Error)) {
      return false
    }
    if (current.name === 'HttpException') {
      return true
    }
    if (isNetworkError(current) || HTTP_FAILURE.test(current.message)) {
      return true
    }
    current = current.cause
  }
  return false
}

// Without a config id the request went to the source automatic matching uses,
// which is the first enabled one that supports it.
export function findSourceName(
  configs: ProviderConfig[],
  providerConfigId?: string
): string | undefined {
  if (providerConfigId !== undefined) {
    return configs.find((config) => config.id === providerConfigId)?.name
  }
  return configs.find((config) => config.enabled && !isLegacyMacCms(config))
    ?.name
}
