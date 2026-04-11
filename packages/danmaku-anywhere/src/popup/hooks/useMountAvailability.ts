import { useMemo } from 'react'
import { match, P } from 'ts-pattern'

import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { useMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { matchUrl } from '@/common/utils/matchUrl'
import type { ActiveTabInfo } from '@/popup/hooks/useActiveTabInfo'
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

interface UrlMatches {
  enabledMatch: MountConfig | undefined
  disabledMatch: MountConfig | undefined
}

function findConfigMatchingUrl(
  configs: readonly MountConfig[],
  url: string,
  enabled: boolean
): MountConfig | undefined {
  return configs.find((config) => {
    if (config.enabled !== enabled) {
      return false
    }
    return config.patterns.some((pattern) => matchUrl(url, pattern))
  })
}

// Prefer an enabled match. A disabled config only surfaces as an "enable me"
// banner when no enabled config is matching the URL.
function findUrlMatches(
  configs: readonly MountConfig[],
  info: ActiveTabInfo | null
): UrlMatches {
  if (info === null) {
    return { enabledMatch: undefined, disabledMatch: undefined }
  }
  const enabledMatch = findConfigMatchingUrl(configs, info.url, true)
  if (enabledMatch) {
    return { enabledMatch, disabledMatch: undefined }
  }
  return {
    enabledMatch: undefined,
    disabledMatch: findConfigMatchingUrl(configs, info.url, false),
  }
}

interface AvailabilityInputs {
  extensionEnabled: boolean
  info: ActiveTabInfo | null
  enabledMatch: MountConfig | undefined
  disabledMatch: MountConfig | undefined
  isConnected: boolean | undefined
}

function deriveAvailability(inputs: AvailabilityInputs): MountAvailability {
  return match(inputs)
    .returnType<MountAvailability>()
    .with({ extensionEnabled: false }, () => ({ kind: 'disabled' }))
    .with({ info: null }, () => ({ kind: 'unsupported' }))
    .with({ disabledMatch: P.not(P.nullish) }, ({ disabledMatch }) => ({
      kind: 'disabledConfig',
      configId: disabledMatch.id,
      configName: disabledMatch.name,
    }))
    .with({ enabledMatch: P.nullish, info: P.not(null) }, ({ info }) => ({
      kind: 'noConfig',
      url: info.url,
      pattern: info.pattern,
      name: info.name,
    }))
    .with({ isConnected: true }, () => ({ kind: 'connected' }))
    .otherwise(() => ({ kind: 'pending' }))
}

export function useMountAvailability(): MountAvailability {
  const { data: extensionOptions } = useExtensionOptions()
  const { configs } = useMountConfig()
  const info = useActiveTabInfo()

  const extensionEnabled = extensionOptions.enabled
  const { enabledMatch, disabledMatch } = findUrlMatches(configs, info)

  const isConnected = useIsConnected({
    enabled: extensionEnabled && enabledMatch !== undefined,
  })

  // Memoize by primitive identifiers so consumers can rely on reference
  // stability when using availability as an effect dependency.
  return useMemo(
    () =>
      deriveAvailability({
        extensionEnabled,
        info,
        enabledMatch,
        disabledMatch,
        isConnected,
      }),
    [
      extensionEnabled,
      info,
      enabledMatch?.id,
      disabledMatch?.id,
      disabledMatch?.name,
      isConnected,
    ]
  )
}
