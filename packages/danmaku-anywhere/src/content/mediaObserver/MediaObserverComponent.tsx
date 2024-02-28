import { useMediaObserver } from './useMediaObserver'

import type { MountConfig } from '@/common/constants/mountConfig'

interface MediaObserverComponentProps {
  config: MountConfig
}

export const MediaObserverComponent = ({
  config,
}: MediaObserverComponentProps) => {
  useMediaObserver(config)
  return null
}
