import { useStore } from '../store/store'

import { useMediaObserver } from './useMediaObserver'

import type { MountConfig } from '@/common/constants/mountConfig'

interface MediaObserverComponentProps {
  config: MountConfig
}

export const MediaObserverComponent = ({
  config,
}: MediaObserverComponentProps) => {
  const manual = useStore((state) => state.manual)

  if (manual) return null

  return <MediaObserverHookWrapper config={config} />
}

const MediaObserverHookWrapper = ({ config }: MediaObserverComponentProps) => {
  useMediaObserver(config)

  return null
}
