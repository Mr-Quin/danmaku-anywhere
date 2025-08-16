import { Stack } from '@mui/material'

import { CommentsTable } from '@/common/components/CommentsTable'
import { NothingHere } from '@/common/components/NothingHere'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

export const CommentsPage = () => {
  const hasVideo = useStore.use.hasVideo()
  const { comments, episodes } = useStore.use.danmaku()
  const seekToTime = useStore.use.seekToTime()

  const { refreshComments, loadMutation, canRefresh } = useLoadDanmaku()

  return (
    <Stack height="100%" flexGrow={1}>
      {episodes ? (
        <CommentsTable
          comments={comments}
          onTimeClick={seekToTime}
          isTimeClickable={hasVideo()}
          onRefresh={refreshComments}
          showRefresh={canRefresh}
          isRefreshing={loadMutation.isPending}
        />
      ) : (
        <NothingHere />
      )}
    </Stack>
  )
}
