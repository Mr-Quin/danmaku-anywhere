import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo } from 'react'

import { useAllDanmakuQuerySuspense } from '@/popup/hooks/useAllDanmakuQuerySuspense'

interface DanmakuListProps {
  scrollElement: any
}

export const DanmakuList = ({ scrollElement }: DanmakuListProps) => {
  const { data, isFetching } = useAllDanmakuQuerySuspense()

  const groupedData = useMemo(
    () => Object.groupBy(data ?? [], (item) => item.meta.animeTitle),
    [data]
  )
  const titles = Object.keys(groupedData).toSorted()

  const virtualizer = useVirtualizer({
    count: titles.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 40,
  })

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
          const title = titles[virtualItem.index]

          return (
            <ListItemButton
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
            >
              <ListItemText
                primary={title}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {groupedData[title].length} episodes
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
