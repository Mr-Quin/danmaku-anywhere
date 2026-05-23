import { Box, Container } from '@mui/material'
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
    <Container
      sx={{
        padding: 0,
        width: width,
        maxWidth: width,
        height: height,
        maxHeight: height,
        overflow: 'hidden',
      }}
      fixed
    >
      <Box
        sx={{
          height: 1,
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'background.default',
        }}
      >
        {children}
        <DevWatermark />
      </Box>
    </Container>
  )
}
