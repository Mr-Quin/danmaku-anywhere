import { ChevronLeft } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EpisodeList } from './EpisodeList'

import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'
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
      />
      <EpisodeList scrollElement={ref as HTMLDivElement} />
    </TabLayout>
  )
}
