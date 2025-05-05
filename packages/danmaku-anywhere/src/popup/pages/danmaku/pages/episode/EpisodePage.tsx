import { ChevronLeft } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { Link, useParams } from 'react-router'

import { EpisodeList } from './EpisodeList'

import { useGetSeasonSuspense } from '@/common/anime/queries/useSeasonsSuspense'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { ExportDanmakuButton } from '@/popup/pages/danmaku/components/ExportDanmakuButton'

export const EpisodePage = () => {
  const params = useParams()

  const seasonId = params.seasonId ? parseInt(params.seasonId) : 0

  const {
    data: [season],
  } = useGetSeasonSuspense({
    id: seasonId,
  })

  return (
    <TabLayout>
      <TabToolbar
        title={season.title}
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
      <EpisodeList />
    </TabLayout>
  )
}
