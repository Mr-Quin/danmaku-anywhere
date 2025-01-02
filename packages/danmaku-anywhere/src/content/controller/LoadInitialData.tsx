import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

import { Logger } from '@/common/Logger'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'

export const LoadInitialData = ({ children }: PropsWithChildren) => {
  const config = useActiveConfig()
  const { data: options } = useExtensionOptions()

  useEffect(() => {
    Logger.debug('Loading initial data', { config, options })
  }, [config, options])

  // the script should not be loaded at all if the config is not enabled
  // this check is likely only necessary for when the user manually
  // disables the config after the script has been loaded
  if (!config || !config.enabled) return null
  if (!options.enabled) return null

  return children
}
