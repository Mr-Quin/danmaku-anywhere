import { Delete, Publish } from '@mui/icons-material'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  IconButton,
  CircularProgress,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'
import { useDeleteDanmaku } from '@/common/queries/danmaku/useDeleteDanmaku'
import { useIsConnected } from '@/popup/hooks/useIsConnected'
import { useMountDanmaku } from '@/popup/hooks/useMountDanmaku'
import { useStore } from '@/popup/store'

interface EpisodeListProps {
  scrollElement: HTMLDivElement
}

export const EpisodeList = ({ scrollElement }: EpisodeListProps) => {
  const { data, isFetching } = useAllDanmakuQuerySuspense()

  const { animeId } = useParams()

  const { setSelectedEpisode } = useStore.use.danmaku()

  const episodes = useMemo(
    () =>
      data
        .filter((item) => item.meta.animeId.toString() === animeId)
        .toSorted((a, b) => a.meta.episodeId - b.meta.episodeId),
    [data]
  )

  const virtualizer = useVirtualizer({
    count: episodes.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 40,
  })

  const navigate = useNavigate()

  const { mutate: deleteDanmaku, isPending: isDeleting } = useDeleteDanmaku()
  const { mutateAsync: mount, isPending: isMounting } = useMountDanmaku()
  const { data: isConnected } = useIsConnected()

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
          const episode = episodes[virtualItem.index]
          const {
            meta: { episodeTitle, episodeId },
            count,
          } = episode

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
                  <Tooltip title="Mount">
                    <span>
                      <IconButton
                        onClick={() => mount(episode.meta)}
                        disabled={!isConnected || isMounting}
                      >
                        {isMounting ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          <Publish />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <span>
                      <IconButton
                        onClick={() => deleteDanmaku(episodeId)}
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
                  navigate(episodeId.toString())
                  setSelectedEpisode(episodeTitle ?? '')
                }}
              >
                <ListItemText
                  primary={episodeTitle}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {count} comments
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
