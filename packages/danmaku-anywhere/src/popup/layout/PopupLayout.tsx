import { Container, Paper } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const PopupLayout = ({ children }: PropsWithChildren) => {
  return (
    <Container
      sx={{
        padding: 0,
        width: 500,
        maxWidth: 500,
        height: 600,
        maxHeight: 600,
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
