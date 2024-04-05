import { memo } from 'react'

import { useMediaObserver } from './useMediaObserver'

import type { MountConfig } from '@/common/constants/mountConfig'

interface MediaObserverProps {
  config: MountConfig
}

export const MediaObserver = memo(({ config }: MediaObserverProps) => {
  useMediaObserver(config)

  return null
})

MediaObserver.displayName = 'MediaObserver'
