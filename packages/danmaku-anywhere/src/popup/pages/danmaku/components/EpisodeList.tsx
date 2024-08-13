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
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createSearchParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import { useDeleteDanmaku } from '@/common/danmaku/queries/useDeleteDanmaku'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useStore } from '@/popup/store'

interface EpisodeListProps {
  scrollElement: HTMLDivElement
}

export const EpisodeList = ({ scrollElement }: EpisodeListProps) => {
  const { t } = useTranslation()
  const { data, isFetching } = useAllDanmakuQuerySuspense()

  const [searchParams] = useSearchParams()

  const type = searchParams.get('type')!

  const { setSelectedEpisode, selectedAnime } = useStore.use.danmaku()

  const episodes = useMemo(() => {
    return data.filter((item) => item.meta.seasonTitle === selectedAnime)
    // .toSorted((a, b) => a.meta.episodeId - b.meta.episodeId)
  }, [data])

  const virtualizer = useVirtualizer({
    count: episodes.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 40,
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
        opacity: isFetching ? 0.5 : 1,
      }}
    >
      <List>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const danmakuLite = episodes[virtualItem.index]
          const {
            meta: { episodeTitle },
            commentCount,
            id,
          } = danmakuLite

          return (
            <ListItem
              key={episodeTitle}
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
                    pathname: 'comment',
                    search: createSearchParams({
                      type: type,
                      title: selectedAnime,
                      id: id.toString(),
                      episodeTitle: episodeTitle ?? '',
                    }).toString(),
                  })
                  setSelectedEpisode(episodeTitle ?? '')
                }}
              >
                <ListItemText
                  primary={episodeTitle}
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
