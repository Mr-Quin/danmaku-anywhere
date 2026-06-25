import { Sync } from '@mui/icons-material'
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

  const { isMounted, episodes } = useStore.use.danmaku()

  const hasEpisodes = episodes && episodes.length > 0

  const unmountMutation = useUnmountDanmaku()
  const { refreshComments, canRefresh, loadMutation } = useLoadDanmaku()

  const handleUnmount = () => {
    unmountMutation.mutate()
  }

  const { titles, title, totalCommentCount } = useMemo(() => {
    if (!episodes || episodes.length === 0) {
      return {
        title: '',
        titles: [],
        totalCommentCount: 0,
      }
    }

    const totalCommentCount = episodes.reduce(
      (sum, episode) => sum + episode.commentCount,
      0
    )

    return {
      title: episodeToString(episodes[0]),
      titles: episodes.map((e) => {
        return <div key={e.id}>{episodeToString(e)}</div>
      }),
      totalCommentCount,
    }
  }, [episodes])

  return (
    <Collapse in={isMounted} unmountOnExit>
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
          <Box
            sx={{
              display: 'flex',
              minWidth: 0,
            }}
          >
            <Tooltip title={titles}>
              <Typography noWrap>{title}</Typography>
            </Tooltip>
            <Typography
              sx={{ color: 'text.secondary', pl: 0.5, flexShrink: 0 }}
            >
              ({totalCommentCount})
            </Typography>
          </Box>
          <Box
            sx={{
              flexShrink: 0,
            }}
          >
            {canRefresh && (
              <Tooltip title={t('danmaku.refresh', 'Refresh Danmaku')}>
                <IconButton
                  onClick={refreshComments}
                  disabled={!canRefresh || loadMutation.isPending}
                  color="primary"
                >
                  <Sync />
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
              {t('danmaku.unmount', 'Unmount')}
            </Button>
          </Box>
        </Toolbar>
      )}
    </Collapse>
  )
}
