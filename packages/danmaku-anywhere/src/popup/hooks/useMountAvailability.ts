import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { matchUrl } from '@/common/utils/matchUrl'
import { useActiveTabInfo } from '@/popup/hooks/useActiveTabInfo'
import { useIsConnected } from '@/popup/hooks/useIsConnected'

export type MountAvailability =
  | { kind: 'pending' }
  | { kind: 'connected' }
  | { kind: 'unsupported' }
  | { kind: 'disabled' }
  | {
      kind: 'disabledConfig'
      configId: string
      configName: string
    }
  | {
      kind: 'noConfig'
      url: string
      pattern: string
      name: string
    }

const MOUNTABLE_PROTOCOLS = new Set(['http:', 'https:', 'file:'])

export function useMountAvailability(): MountAvailability {
  const { data: extensionOptions } = useExtensionOptions()
  const { configs } = useMountConfig()
  const info = useActiveTabInfo()

  const isExtensionEnabled = extensionOptions.enabled
  const isMountableUrl = info !== null && MOUNTABLE_PROTOCOLS.has(info.protocol)

  // Match against the URL ignoring the enabled flag so we can tell the
  // difference between "no config exists" and "config exists but is disabled".
  const matchingConfig = info
    ? configs.find((config) =>
        config.patterns.some((pattern) => matchUrl(info.url, pattern))
      )
    : undefined
  const hasEnabledMatch = matchingConfig?.enabled === true

  // Only ping the content script when we expect one to be running: extension
  // globally enabled, URL mountable, and an enabled config matches.
  const isConnected = useIsConnected({
    enabled: isExtensionEnabled && isMountableUrl && hasEnabledMatch,
  })

  if (!isExtensionEnabled) {
    return { kind: 'disabled' }
  }
  if (!isMountableUrl || info === null) {
    return { kind: 'unsupported' }
  }
  if (matchingConfig && !matchingConfig.enabled) {
    return {
      kind: 'disabledConfig',
      configId: matchingConfig.id,
      configName: matchingConfig.name,
    }
  }
  if (!matchingConfig) {
    return {
      kind: 'noConfig',
      url: info.url,
      pattern: info.pattern,
      name: info.name,
    }
  }
  // Matching enabled config: wait for the content script to respond.
  if (isConnected === undefined || !isConnected) {
    return { kind: 'pending' }
  }
  return { kind: 'connected' }
}
