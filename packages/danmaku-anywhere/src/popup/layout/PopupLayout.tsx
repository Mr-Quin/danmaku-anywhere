import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { useEnvironment } from '@/popup/context/Environment'
import { Container, Paper } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const PopupLayout = ({ children }: PropsWithChildren<{}>) => {
  const { isMobile } = usePlatformInfo()
  const { isPopup } = useEnvironment()

  if (!isPopup) {
    return (
      <Paper
        sx={{
          minHeight: '100vh',
        }}
      >
        {children}
      </Paper>
    )
  }

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
      disableGutters
      maxWidth={false}
    >
      <Paper
        sx={{
          height: 1,
          overflow: 'hidden',
        }}
      >
        {children}
      </Paper>
    </Container>
  )
}
