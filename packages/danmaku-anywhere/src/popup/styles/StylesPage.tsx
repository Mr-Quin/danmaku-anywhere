import { Box, Typography } from '@mui/material'

import { DanmakuOptionsController } from './StylesForm'

export const StylesPage = () => {
  return (
    <Box p={2} overflow="hidden">
      <Typography variant="h6" gutterBottom>
        Danmaku Style
      </Typography>
      <DanmakuOptionsController />
    </Box>
  )
}
