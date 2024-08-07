import { Refresh } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useRefreshComments } from '../../../common/hooks/useRefreshComments'
import { useStore } from '../../../store/store'

import { CommentsTable } from '@/common/components/CommentsTable'
import { useMediaElementStore } from '@/content/store/mediaElementStore'

export const CommentsPanel = () => {
  const { t } = useTranslation()
  const { comments } = useStore()

  const { refreshComments, isPending, canRefresh } = useRefreshComments()
  const videoNode = useMediaElementStore.use.videoNode()

  const handleGoToTimestamp = (time: number) => {
    if (!videoNode) return
    videoNode.currentTime = time
  }

  return (
    <Stack height="100%" flexGrow={1}>
      <Toolbar
        variant="dense"
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          minHeight: 32,
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('danmaku.commentCounted', { count: comments.length })}
        </Typography>
        {canRefresh && (
          <Tooltip title={t('danmaku.refresh')}>
            <IconButton color="primary" onClick={refreshComments}>
              {isPending ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
      <CommentsTable
        comments={comments}
        onTimeClick={handleGoToTimestamp}
        isTimeClickable={videoNode !== null}
      />
    </Stack>
  )
}
