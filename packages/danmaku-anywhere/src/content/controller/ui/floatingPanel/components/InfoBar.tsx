import { Refresh } from '@mui/icons-material'
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { episodeToString } from '@/common/danmaku/utils'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useStore } from '@/content/controller/store/store'

export const InfoBar = () => {
  const { t } = useTranslation()

  const { isMounted, episodes, comments } = useStore.use.danmaku()

  const hasEpisodes = episodes && episodes.length > 0

  const unmountMutation = useUnmountDanmaku()
  const { refreshComments, canRefresh, loadMutation } = useLoadDanmaku()

  const handleUnmount = () => {
    unmountMutation.mutate()
  }

  const { titles, title } = useMemo(() => {
    if (!episodes || episodes.length === 0) {
      return {
        title: '',
        titles: [],
      }
    }
    return {
      title: episodeToString(episodes[0]),
      titles: episodes.map((e) => {
        return <div key={e.id}>{episodeToString(e)}</div>
      }),
    }
  }, [episodes])

  return (
    <Collapse in={isMounted}>
      {hasEpisodes && (
        <Toolbar
          variant="dense"
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            backgroundColor: 'background.paper',
            gap: 1,
            justifyContent: 'space-between',
          }}
        >
          <Tooltip title={titles}>
            <Typography noWrap>{title}</Typography>
          </Tooltip>
          <Typography sx={{ color: 'text.secondary', pl: 0.5, flexShrink: 0 }}>
            ({comments.length})
          </Typography>
          <Box flexShrink={0}>
            {canRefresh && (
              <Tooltip title={t('danmaku.refresh')}>
                <IconButton
                  onClick={refreshComments}
                  disabled={!canRefresh || loadMutation.isPending}
                  color="primary"
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
            <Button
              variant="outlined"
              type="button"
              onClick={handleUnmount}
              color="warning"
              disabled={!isMounted}
              sx={{ flexShrink: 0 }}
            >
              {t('danmaku.unmount')}
            </Button>
          </Box>
        </Toolbar>
      )}
    </Collapse>
  )
}
