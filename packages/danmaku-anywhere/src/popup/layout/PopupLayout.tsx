import { Box } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { DevWatermark } from '@/common/components/DevWatermark'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { isDetachedWindow } from '@/popup/utils/isDetachedWindow'

export const PopupLayout = ({ children }: PropsWithChildren<{}>) => {
  const { isMobile } = usePlatformInfo()

  const fillViewport = isMobile || isDetachedWindow()
  const width = fillViewport ? '100vw' : 500
  const height = fillViewport ? '100vh' : 600

  return (
    <Box
      sx={{
        width,
        maxWidth: width,
        height,
        maxHeight: height,
        overflow: 'hidden',
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      {children}
      <DevWatermark />
    </Box>
  )
}
