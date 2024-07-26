import type { PropsWithChildren } from 'react'

import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useMatchMountConfig } from '@/common/options/mountConfig/useMatchMountConfig'

export const LoadInitialData = ({ children }: PropsWithChildren) => {
  const config = useMatchMountConfig(window.location.href)
  const { data: options } = useExtensionOptions()

  // the script should not be loaded at all if the config is not enabled
  // this check is likely only necessary for when the user manually
  // disables the config after the script has been loaded
  if (!config || !config.enabled) return null
  if (!options.enabled) return null

  return children
}
