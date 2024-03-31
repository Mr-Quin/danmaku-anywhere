import { Box, Divider, Toolbar, Typography } from '@mui/material'
import { useState } from 'react'

import { DanmakuList } from './DanmakuList'
import { ExportButton } from './ExportButton'

export const DanmakuPage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()

  return (
    <Box overflow="auto" ref={setRef}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Danmaku List
        </Typography>
        <ExportButton />
      </Toolbar>
      <Divider />
      <DanmakuList scrollElement={ref as HTMLDivElement} />
    </Box>
  )
}
