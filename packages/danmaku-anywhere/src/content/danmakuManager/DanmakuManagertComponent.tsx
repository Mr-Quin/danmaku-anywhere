import { useDanmakuManager } from './useDanmakuManager'

import type { MountConfig } from '@/common/constants/mountConfig'

interface DanmakuManagerComponentProps {
  config: MountConfig
}

export const DanmakuManagerComponent = ({
  config,
}: DanmakuManagerComponentProps) => {
  const [ref, rect] = useDanmakuManager(config)

  return (
    <div
      ref={ref}
      style={{
        visibility: rect ? 'visible' : 'hidden',
        pointerEvents: 'none',
        position: 'absolute',
        top: rect?.top,
        left: rect?.left,
        width: rect?.width,
        height: rect?.height,
        zIndex: 999999,
      }}
    />
  )
}
