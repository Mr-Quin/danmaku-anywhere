import { Refresh, Search } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CommentsTable } from '@/common/components/CommentsTable'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useStore } from '@/content/controller/store/store'

export const CommentsPage = () => {
  const { t } = useTranslation()
  const hasVideo = useStore.use.hasVideo()
  const { comments } = useStore.use.danmaku()
  const seekToTime = useStore.use.seekToTime()
  const [filterText, setFilterText] = useState('')

  const { refreshComments, loadMutation, canRefresh } = useLoadDanmaku()

  // Filter comments based on search text
  const filteredComments = useMemo(() => {
    if (!filterText.trim()) {
      return comments
    }
    
    const searchText = filterText.toLowerCase()
    return comments.filter(comment => 
      comment.m.toLowerCase().includes(searchText)
    )
  }, [comments, filterText])

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value)
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
          {t('danmaku.commentCounted', { count: filteredComments.length })}
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
      
      {/* Filter Box */}
      <Stack sx={{ px: 2, py: 1, backgroundColor: 'background.paper' }}>
        <TextField
          size="small"
          placeholder={t('common.search', { defaultValue: 'Search...' })}
          value={filterText}
          onChange={handleFilterChange}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.default',
            },
          }}
        />
      </Stack>
      
      <CommentsTable
        comments={filteredComments}
        onTimeClick={seekToTime}
        isTimeClickable={hasVideo()}
      />
    </Stack>
  )
}
