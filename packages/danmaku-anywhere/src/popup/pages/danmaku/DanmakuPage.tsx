import { Box } from '@mui/material'
import { useState } from 'react'

import { DanmakuList } from './DanmakuList'
import { ExportButton } from './ExportButton'

import { PageToolbar } from '@/popup/component/PageToolbar'

export const DanmakuPage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()

  return (
    <Box overflow="auto" ref={setRef}>
      <PageToolbar title="Danmaku List">
        <ExportButton />
      </PageToolbar>
      <DanmakuList scrollElement={ref as HTMLDivElement} />
    </Box>
  )
}
