import { Refresh, Search } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'

import { CommentsTable } from '@/common/components/CommentsTable'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

export const CommentsPage = () => {
  const { t } = useTranslation()
  const hasVideo = useStore.use.hasVideo()
  const { comments } = useStore.use.danmaku()
  const seekToTime = useStore.use.seekToTime()

  const { refreshComments, loadMutation, canRefresh } = useLoadDanmaku()

  const [filter, setFilter] = useState('')
  const filteredComments = useMemo(() => {
    const keyword = filter.trim().toLowerCase()
    if (!keyword) return comments
    return comments.filter((c) => c.m.toLowerCase().includes(keyword))
  }, [comments, filter])

  return (
    <Stack height="100%" flexGrow={1}>
      <Toolbar
        variant="dense"
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          minHeight: 32,
          backgroundColor: 'background.paper',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('danmaku.commentCounted', { count: filteredComments.length })}
        </Typography>
        <TextField
          size="small"
          variant="filled"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('common.search')}
          sx={{ width: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
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
        comments={filteredComments}
        onTimeClick={seekToTime}
        isTimeClickable={hasVideo()}
        onFilterComment={setFilter}
      />
    </Stack>
  )
}
