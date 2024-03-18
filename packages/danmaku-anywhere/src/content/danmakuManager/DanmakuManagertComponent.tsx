import { Box } from '@mui/material'
import { useEffect, useRef } from 'react'

import { useNodeMonitor } from '../hooks/useNodeMonitor'

import { useDanmakuManager } from './useDanmakuManager'
import { useRect } from './useRect'

import type { SafeZones } from '@/common/constants/danmakuOptions'
import type { MountConfig } from '@/common/constants/mountConfig'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'

interface DanmakuManagerComponentProps {
  config: MountConfig
}

// get a padding string for the safe zone
const calculatePaddings = (safeZones: SafeZones, rect?: DOMRectReadOnly) => {
  const { top, bottom } = safeZones

  if (!rect) return { paddingTop: '0px', paddingBottom: '0px' }

  const paddingTop = (rect.height * top) / 100
  const paddingBottom = (rect.height * bottom) / 100

  return {
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
  }
}

export const DanmakuManagerComponent = ({
  config,
}: DanmakuManagerComponentProps) => {
  const { data: options } = useDanmakuOptions()

  const videoNode = useNodeMonitor<HTMLVideoElement>(config.mediaQuery)

  const rect = useRect(videoNode)
  const ref = useRef<HTMLDivElement>(null)

  const danmakuEngine = useDanmakuManager(config, videoNode, ref.current)

  useEffect(() => {
    if (danmakuEngine.created) {
      danmakuEngine.resize()
    }
  }, [rect, options.safeZones])

  const paddings = calculatePaddings(options.safeZones, rect)

  return (
    <Box
      id="danmaku-anywhere-danmaku-container"
      sx={{
        visibility: rect ? 'visible' : 'hidden',
        pointerEvents: 'none',
        position: 'absolute',
        top: rect?.top,
        left: rect?.left,
        width: rect?.width,
        height: rect?.height,
        ...paddings,
        zIndex: 999999,
        boxSizing: 'border-box',
      }}
    >
      <Box
        ref={ref}
        sx={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
        }}
      />
    </Box>
  )
}
