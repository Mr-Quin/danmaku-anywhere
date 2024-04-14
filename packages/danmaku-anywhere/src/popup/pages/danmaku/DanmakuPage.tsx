import { ChevronLeft } from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'

import { CommentsTable } from '@/common/components/CommentsTable'
import { useDanmakuQuerySuspense } from '@/common/queries/danmaku/useDanmakuQuerySuspense'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'
import { useStore } from '@/popup/store'

export const DanmakuPage = () => {
  const { episodeId } = useParams()

  const { data } = useDanmakuQuerySuspense(parseInt(episodeId!))

  const { selectedAnime, selectedEpisode } = useStore.use.danmaku()

  return (
    <TabLayout>
      <TabToolbar
        title={`${selectedAnime} - ${selectedEpisode}`}
        leftElement={
          <IconButton edge="start" component={Link} to="..">
            <ChevronLeft />
          </IconButton>
        }
      />
      {data ? (
        <CommentsTable comments={data.comments} flexGrow={1} height="initial" />
      ) : (
        <Box p={2}>
          <Typography>Something went wrong.</Typography>
        </Box>
      )}
    </TabLayout>
  )
}
