import { Box } from '@mui/material'
import { useEffect, useState } from 'react'

import { useContainerNode } from './useContainerNode'
import { useFullScreenElement } from './useFullScreenElement'
import { useVideoNode } from './useVideoNode'

import type { SafeZones } from '@/common/options/danmakuOptions/constant'
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import { useRect } from '@/content/danmaku/container/monitors/useRect'
import { useVideoSrc } from '@/content/danmaku/container/monitors/useVideoSrc'
import { useDanmakuManager } from '@/content/danmaku/container/useDanmakuManager'

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
  const { data: options } = useDanmakuOptions()

  const [paddings, setPaddings] = useState({
    paddingTop: '0px',
    paddingBottom: '0px',
  })

  const config = useActiveConfig()

  const videoNode = useVideoNode(config.mediaQuery)

  const videoSrc = useVideoSrc(videoNode)

  const rect = useRect(videoNode)

  const ref = useContainerNode()
  useFullScreenElement(rect)

  const danmakuEngine = useDanmakuManager(videoNode, ref.current, videoSrc)

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
        top: rect?.top ?? 0,
        left: rect?.left ?? 0,
        width: rect?.width,
        height: rect?.height,
        ...paddings,
        boxSizing: 'border-box',
        border: import.meta.env.DEV ? '1px solid red' : 'none',
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
