import { Box, Paper, Slide } from '@mui/material'
import type { PropsWithChildren } from 'react'

export const OptionsPage = ({ children }: PropsWithChildren) => {
  return (
    <Box position="absolute" top={0} zIndex={1} width={1}>
      <Slide direction="up" in mountOnEnter unmountOnExit>
        <Paper sx={{ height: '100vh' }}>{children}</Paper>
      </Slide>
    </Box>
  )
}
