import { useIconManager } from './useIconManager'

import type { MountConfig } from '@/common/constants/mountConfig'

interface IconManagerComponentProps {
  config: MountConfig
}

export const IconManagerComponent = ({ config }: IconManagerComponentProps) => {
  useIconManager(config)
  return null
}
