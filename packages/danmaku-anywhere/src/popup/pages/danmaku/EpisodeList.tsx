import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAllDanmakuQuerySuspense } from '@/common/hooks/useAllDanmakuQuerySuspense'
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

  if (!data.length) return <Typography>No danmaku</Typography>

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
          const {
            meta: { episodeTitle, episodeId },
            count,
          } = episodes[virtualItem.index]

          return (
            <ListItemButton
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
          )
        })}
      </List>
    </Box>
  )
}
