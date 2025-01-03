import { ChevronLeft } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { useState } from 'react'
import { Link } from 'react-router'

import { EpisodeList } from '../components/EpisodeList'

import { DrilldownMenu } from '@/popup/component/DrilldownMenu'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'
import { ExportDanmakuButton } from '@/popup/pages/danmaku/components/ExportDanmakuButton'
import { useStore } from '@/popup/store'

export const EpisodePage = () => {
  const [ref, setRef] = useState<HTMLDivElement>()

  const title = useStore.use.danmaku().selectedAnime

  return (
    <TabLayout ref={setRef}>
      <TabToolbar
        title={title}
        leftElement={
          <IconButton edge="start" component={Link} to="..">
            <ChevronLeft />
          </IconButton>
        }
      >
        <DrilldownMenu ButtonProps={{ edge: 'end' }}>
          <ExportDanmakuButton />
        </DrilldownMenu>
      </TabToolbar>
      <EpisodeList scrollElement={ref as HTMLDivElement} />
    </TabLayout>
  )
}
