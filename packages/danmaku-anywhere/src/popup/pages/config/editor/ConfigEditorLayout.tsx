import { Box, Slide, Paper } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const ConfigEditorLayout = ({ children }: PropsWithChildren) => {
  return (
    <Box position="absolute" top={0} zIndex={1} width={1} overflow="auto">
      <Slide direction="up" in mountOnEnter unmountOnExit>
        <Paper sx={{ height: '100vh' }}>{children}</Paper>
      </Slide>
    </Box>
  )
}
