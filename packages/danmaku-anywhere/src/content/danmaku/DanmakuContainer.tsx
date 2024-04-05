import { Box } from '@mui/material'
import { useEffect, useState } from 'react'

import { useRect } from '../hooks/useRect'

import { DanmakuManager } from './danmakuManager/DanmakuManager'
import { useContainerNode } from './danmakuManager/hooks/useContainerNode'
import { useVideoNode } from './danmakuManager/hooks/useVideoNode'

import type { SafeZones } from '@/common/constants/danmakuOptions'
import type { MountConfig } from '@/common/constants/mountConfig'
import { useDanmakuOptions } from '@/common/hooks/useDanmakuOptions'
import { useDanmakuEngine } from '@/content/store/danmakuEngineStore'
import { AutomaticMode } from './AutomaticMode'
import { MediaObserver } from './mediaObserver/MediaObserver'
import { TabRpcServer } from './tabRpc/TabRpc'

interface DanmakuManagerProps {
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

export const DanmakuContainer = ({ config }: DanmakuManagerProps) => {
  const { data: options } = useDanmakuOptions()
  const [paddings, setPaddings] = useState({
    paddingTop: '0px',
    paddingBottom: '0px',
  })

  const videoNode = useVideoNode(config.mediaQuery)

  const rect = useRect(videoNode)
  const ref = useContainerNode()

  const danmakuEngine = useDanmakuEngine()

  useEffect(() => {
    if (danmakuEngine.created) {
      danmakuEngine.resize()
    }
    setPaddings(calculatePaddings(options.safeZones, rect))
  }, [rect, options.safeZones])

  return (
    <>
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
      <TabRpcServer />
      <AutomaticMode>
        <DanmakuManager />
        <MediaObserver config={config} />
      </AutomaticMode>
    </>
  )
}
