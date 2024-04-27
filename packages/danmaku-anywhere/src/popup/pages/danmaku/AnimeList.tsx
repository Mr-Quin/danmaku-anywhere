import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createSearchParams, useNavigate } from 'react-router-dom'

import { NoAnime } from './components/NoAnime'

import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'
import { useStore } from '@/popup/store'

interface AnimeListProps {
  scrollElement: HTMLDivElement
}

export const AnimeList = ({ scrollElement }: AnimeListProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data, isFetching } = useAllDanmakuQuerySuspense()

  const { animeFilter: filter, setSelectedAnime } = useStore.use.danmaku()

  const filteredData = useMemo(() => {
    if (!filter) return data

    return data.filter((item) =>
      item.meta.animeTitle.toLowerCase().includes(filter.toLowerCase())
    )
  }, [data, filter])

  const groupedData = useMemo(
    () => Object.groupBy(filteredData, (item) => item.meta.animeTitle),
    [filteredData]
  )

  // unique titles
  const titles = Object.keys(groupedData).toSorted()

  const virtualizer = useVirtualizer({
    count: titles.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 40,
  })

  if (!filteredData.length) return <NoAnime />

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
          const type = groupedData[title][0].meta.type

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
              onClick={() => {
                navigate({
                  pathname: 'anime',
                  search: createSearchParams({
                    type: type.toString(),
                    title,
                  }).toString(),
                })
                setSelectedAnime(title)
              }}
            >
              <ListItemText
                primary={title}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {t('anime.episodeCounted', {
                      count: groupedData[title].length,
                    })}
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
