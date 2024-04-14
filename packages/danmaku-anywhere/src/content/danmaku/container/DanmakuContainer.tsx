import { Box } from '@mui/material'
import { useEffect, useState } from 'react'

import { useContainerNode } from './useContainerNode'
import { useFullScreenElement } from './useFullScreenElement'
import { useVideoNode } from './useVideoNode'

import type { SafeZones } from '@/common/options/danmakuOptions/danmakuOptions'
import { useDanmakuOptionsSuspense } from '@/common/options/danmakuOptions/useDanmakuOptionsSuspense'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import { useRect } from '@/content/common/hooks/useRect'
import { useDanmakuEngine } from '@/content/store/danmakuEngineStore'

// returns a padding object for the safe zone
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

export const DanmakuContainer = () => {
  const { data: options } = useDanmakuOptionsSuspense()

  const [paddings, setPaddings] = useState({
    paddingTop: '0px',
    paddingBottom: '0px',
  })

  const config = useActiveConfig()

  const videoNode = useVideoNode(config.mediaQuery)

  const rect = useRect(videoNode)

  const ref = useContainerNode()

  const danmakuEngine = useDanmakuEngine()

  const fullScreenElement = useFullScreenElement()

  useEffect(() => {
    /**
     * When the video enters full screen, hide then show the popover
     * so that it will appear on top of the full screen element,
     * since the last element in the top layer is shown on top
     */
    if (fullScreenElement) {
      document.getElementById('danmaku-anywhere')?.hidePopover()
      document.getElementById('danmaku-anywhere')?.showPopover()
    }
  }, [fullScreenElement])

  useEffect(() => {
    if (danmakuEngine.created) {
      danmakuEngine.resize()
    }
    setPaddings(calculatePaddings(options.safeZones, rect))
  }, [rect, options.safeZones])

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
