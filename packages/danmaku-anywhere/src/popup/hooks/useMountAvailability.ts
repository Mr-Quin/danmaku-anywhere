import { useMemo } from 'react'

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

export function useMountAvailability(): MountAvailability {
  const { data: extensionOptions } = useExtensionOptions()
  const { configs } = useMountConfig()
  const info = useActiveTabInfo()

  const isExtensionEnabled = extensionOptions.enabled

  // Prefer an enabled match — only fall back to a disabled match when there
  // is no enabled config for this URL. Otherwise a disabled config listed
  // before an enabled one would incorrectly show the "disabled" banner.
  const matchUrlAgainstConfig = (config: (typeof configs)[number]) =>
    info !== null &&
    config.patterns.some((pattern) => matchUrl(info.url, pattern))
  const enabledMatch = info
    ? configs.find((config) => config.enabled && matchUrlAgainstConfig(config))
    : undefined
  const disabledMatch =
    info && !enabledMatch
      ? configs.find(
          (config) => !config.enabled && matchUrlAgainstConfig(config)
        )
      : undefined

  // Only ping the content script when we expect one to be running: extension
  // globally enabled, URL is mountable (non-null info), and an enabled config
  // matches.
  const isConnected = useIsConnected({
    enabled: isExtensionEnabled && info !== null && enabledMatch !== undefined,
  })

  // Memoize by primitive identifiers so the returned object has a stable
  // reference across renders when nothing actually changed. Consumers (the
  // banner) rely on this stability to avoid infinite render loops when the
  // availability is used as a useEffect dependency.
  return useMemo<MountAvailability>(() => {
    if (!isExtensionEnabled) {
      return { kind: 'disabled' }
    }
    if (info === null) {
      return { kind: 'unsupported' }
    }
    if (disabledMatch) {
      return {
        kind: 'disabledConfig',
        configId: disabledMatch.id,
        configName: disabledMatch.name,
      }
    }
    if (!enabledMatch) {
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
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally
    // keyed on primitive fields of info / matches so the result stays stable
    // across unstable object references from upstream queries.
  }, [
    isExtensionEnabled,
    info?.url,
    info?.pattern,
    info?.name,
    disabledMatch?.id,
    disabledMatch?.name,
    enabledMatch?.id,
    isConnected,
  ])
}
