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

import { CommentsTable } from '@/common/components/CommentsTable'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

export const CommentsPage = () => {
  const { t } = useTranslation()
  const hasVideo = useStore.use.hasVideo()
  const { comments } = useStore.use.danmaku()
  const seekToTime = useStore.use.seekToTime()

  const { refreshComments, loadMutation, canRefresh } = useLoadDanmaku()

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
              {loadMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                <Refresh />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
      <CommentsTable
        comments={comments}
        onTimeClick={seekToTime}
        isTimeClickable={hasVideo()}
      />
    </Stack>
  )
}
