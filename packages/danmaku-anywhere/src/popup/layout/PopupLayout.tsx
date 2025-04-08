import { Container, Paper } from '@mui/material'
import { PropsWithChildren, use } from 'react'

export const PopupLayout = ({
  children,
  platformInfoPromise,
}: PropsWithChildren<{
  platformInfoPromise: Promise<chrome.runtime.PlatformInfo>
}>) => {
  const platformInfo = use(platformInfoPromise)

  const isMobile = platformInfo.os === 'android'

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
        }}
      >
        {children}
      </Paper>
    </Container>
  )
}
