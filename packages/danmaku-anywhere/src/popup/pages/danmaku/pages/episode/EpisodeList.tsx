import { useDanmakuManySuspense } from '@/common/danmaku/queries/useDanmakuManySuspense'
import { useDeleteDanmaku } from '@/common/danmaku/queries/useDeleteDanmaku'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { Delete, Download } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'

export const EpisodeList = () => {
  const { t } = useTranslation()

  const ref = useRef<HTMLDivElement>(null)

  const params = useParams()

  const seasonId = params.seasonId ? parseInt(params.seasonId) : 0

  const { data: episodes } = useDanmakuManySuspense({
    seasonId,
  })

  const virtualizer = useVirtualizer({
    count: episodes.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 72,
  })

  const navigate = useNavigate()

  const { mutate: deleteDanmaku, isPending: isDeleting } = useDeleteDanmaku()
  const { exportMany } = useExportDanmaku()

  useEffect(() => {
    if (episodes.length === 0) {
      navigate('..')
    }
  }, [episodes])

  if (!episodes.length) return <Typography>No danmaku</Typography>

  return (
    <Box
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
      ref={ref}
    >
      <List>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const episode = episodes[virtualItem.index]
          const { title, commentCount, id } = episode

          return (
            <ListItem
              key={title}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              secondaryAction={
                <>
                  <Tooltip title={t('danmaku.export')}>
                    <span>
                      <IconButton
                        onClick={() => exportMany.mutate([id])}
                        disabled={exportMany.isPending}
                      >
                        {exportMany.isPending ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          <Download />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <span>
                      <IconButton
                        onClick={() => deleteDanmaku(id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          <Delete />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              }
              disablePadding
            >
              <ListItemButton
                onClick={() => {
                  navigate({
                    pathname: `${episode.id}`,
                  })
                }}
              >
                <ListItemText
                  primary={title}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {t('danmaku.commentCounted', { count: commentCount })}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )
}
