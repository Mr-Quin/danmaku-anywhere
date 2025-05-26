import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { useEnvironment } from '@/popup/context/Environment'
import { Container, Paper } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const PopupLayout = ({ children }: PropsWithChildren<{}>) => {
  const { isMobile } = usePlatformInfo()
  const { isPopup } = useEnvironment()

  const width = isMobile || !isPopup ? '100vw' : 500
  const height = isMobile || !isPopup ? '100vh' : 600

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
      maxWidth={isPopup ? 'xl' : false}
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
