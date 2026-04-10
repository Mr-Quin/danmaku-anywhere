import type { MountAvailability } from '@/common/components/DanmakuSelector/MountPageContent'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useActiveTabInfo } from '@/popup/hooks/useActiveTabInfo'
import { useIsConnected } from '@/popup/hooks/useIsConnected'

const MOUNTABLE_PROTOCOLS = new Set(['http:', 'https:', 'file:'])

export function useMountAvailability(): MountAvailability {
  const { data: extensionOptions } = useExtensionOptions()
  const info = useActiveTabInfo()

  const isExtensionEnabled = extensionOptions.enabled
  const isMountableUrl = info !== null && MOUNTABLE_PROTOCOLS.has(info.protocol)

  // Only ping the content script on pages that could host danmaku, and only
  // when the extension is globally enabled — unsupported schemes and disabled
  // extensions can never connect, so there's no reason to poll.
  const isConnected = useIsConnected({
    enabled: isExtensionEnabled && isMountableUrl,
  })

  if (!isExtensionEnabled) {
    return { kind: 'disabled' }
  }
  if (!isMountableUrl || info === null) {
    return { kind: 'unsupported' }
  }
  if (isConnected === undefined) {
    return { kind: 'pending' }
  }
  if (isConnected) {
    return { kind: 'connected' }
  }
  return {
    kind: 'noConfig',
    url: info.url,
    pattern: info.pattern,
    name: info.name,
  }
}
