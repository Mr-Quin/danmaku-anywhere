import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'

import { DanmakuList } from './DanmakuList'
import { ExportButton } from './ExportButton'

export const DanmakuPage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()

  return (
    <Box overflow="auto" ref={setRef}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          pt: 2,
        }}
      >
        <Typography variant="h6">Danmaku List</Typography>
        <ExportButton />
      </Stack>
      <DanmakuList scrollElement={ref as HTMLDivElement} />
    </Box>
  )
}
