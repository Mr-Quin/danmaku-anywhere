import { Container, Paper } from '@mui/material'
import type { PropsWithChildren } from 'react'
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
      <Paper
        sx={{
          height: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {children}
      </Paper>
    </Container>
  )
}
