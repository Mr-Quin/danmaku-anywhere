import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Tooltip,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createSearchParams, useNavigate } from 'react-router-dom'

import { NoAnime } from './components/NoAnime'

import { useAllDanmakuQuerySuspense } from '@/common/queries/danmaku/useAllDanmakuQuerySuspense'
import type { DanmakuCacheLite } from '@/common/types/danmaku/Danmaku'
import { DanmakuType } from '@/common/types/danmaku/Danmaku'
import { matchWithPinyin } from '@/common/utils/utils'
import { useStore } from '@/popup/store'

interface AnimeListProps {
  scrollElement: HTMLDivElement
}

const partitionDanmaku = (
  danmakuTypes: DanmakuType[],
  data: DanmakuCacheLite[]
) => {
  return danmakuTypes
    .map((type) => {
      // filter by type
      const items = data.filter((item) => item.meta.type === type)

      // group by anime title
      const grouped = Object.groupBy(items, (item) => item.meta.animeTitle)

      // map to type and count
      const titles = Object.keys(grouped).map((title) => ({
        title,
        count: grouped[title].length,
        type,
      }))

      return {
        items: titles,
      }
    })
    .flatMap((item) => item.items)
    .toSorted((a, b) => a.title.localeCompare(b.title))
}

export const AnimeList = ({ scrollElement }: AnimeListProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data, isFetching } = useAllDanmakuQuerySuspense()

  const {
    animeFilter: filter,
    setSelectedAnime,
    selectedTypes,
  } = useStore.use.danmaku()

  const filteredData = useMemo(() => {
    if (!filter) return data

    return data.filter((item) => matchWithPinyin(item.meta.animeTitle, filter))
  }, [data, filter])

  const titles = useMemo(() => {
    return partitionDanmaku(selectedTypes, filteredData)
  }, [selectedTypes, filteredData])

  const virtualizer = useVirtualizer({
    count: titles.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 40,
  })

  if (!filteredData.length) return <NoAnime />

  return (
    <Box
      sx={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
        opacity: isFetching ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <List>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const { title, type, count } = titles[virtualItem.index]

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
                  }).toString(),
                })
                setSelectedAnime(title)
              }}
            >
              <Tooltip title={title}>
                <ListItemText
                  primary={title}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {t('anime.episodeCounted', {
                        count,
                      })}
                    </Typography>
                  }
                  primaryTypographyProps={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                />
              </Tooltip>
              <ListItemIcon>
                <Chip
                  label={t(`danmaku.type.${DanmakuType[type]}`)}
                  size="small"
                />
              </ListItemIcon>
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )
}
