import { useDanmakuManager } from './useDanmakuManager'

import type { MountConfig } from '@/common/constants/mountConfig'

interface DanmakuManagerComponentProps {
  config: MountConfig
}

export const DanmakuManagerComponent = ({
  config,
}: DanmakuManagerComponentProps) => {
  useDanmakuManager(config)

  return null
}
