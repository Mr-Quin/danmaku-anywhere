import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

import { useStore } from './store/store'

import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { useExtensionOptions } from '@/common/hooks/useExtensionOptions'

export const LoadInitialData = ({ children }: PropsWithChildren) => {
  const config = useMatchMountConfig(window.location.href)
  const { data: options } = useExtensionOptions()

  const setConfig = useStore((state) => state.setConfig)

  useEffect(() => {
    if (config) {
      setConfig(config)
    }
  }, [setConfig, config])

  // the script should not be loaded at all if the config is not enabled
  // this check is likely only necessary for when the user manually disables the config
  if (!config || !config.enabled) return null
  if (!options.enabled) return null

  return children
}
