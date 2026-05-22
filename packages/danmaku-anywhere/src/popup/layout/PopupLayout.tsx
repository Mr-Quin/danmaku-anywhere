import { Box, Container } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { DevWatermark } from '@/common/components/DevWatermark'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'

export const PopupLayout = ({ children }: PropsWithChildren<{}>) => {
  const { isMobile } = usePlatformInfo()

  const width = isMobile ? '100vw' : 500
  const height = isMobile ? '100vh' : 600

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
