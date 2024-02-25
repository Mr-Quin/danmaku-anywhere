import {
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'

import { useAllDanmakuQuery } from '../hooks/useAllDanmakuQuery'

import { ExportButton } from './components/ExportButton'

declare global {
  interface ObjectConstructor {
    groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]>
  }
}

export const DanmakuPage = () => {
  const { data, isLoading } = useAllDanmakuQuery({ enabled: true })

  const ref = useRef(null)

  const groupedData = useMemo(
    () => Object.groupBy(data ?? [], (item) => item.meta.animeTitle),
    [data]
  )
  const titles = Object.keys(groupedData).toSorted()

  const virtualizer = useVirtualizer({
    count: titles.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 40,
  })

  if (isLoading)
    return (
      <Box
        height={1}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <CircularProgress />
      </Box>
    )

  if (!data?.length) return <Typography>No danmaku</Typography>

  return (
    <Box overflow="auto" ref={ref}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          pt: 2,
        }}
      >
        <Typography variant="h6">Danmaku List</Typography>
        <ExportButton />
      </Stack>
      <Box
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
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
    </Box>
  )
}
