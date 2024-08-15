import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createSearchParams, useNavigate } from 'react-router-dom'

import { NoAnime } from './NoAnime'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import { matchWithPinyin } from '@/common/utils/utils'
import { useStore } from '@/popup/store'

interface AnimeListProps {
  scrollElement: HTMLDivElement
}

const partitionDanmaku = (
  danmakuTypes: DanmakuSourceType[],
  data: DanmakuLite[]
) => {
  return danmakuTypes
    .map((type) => {
      // filter by type
      const items = data.filter((item) => item.provider === type)

      // group by anime title
      const grouped = Object.groupBy(items, (item) => item.seasonTitle)

      // map to type and count
      const titles = Object.keys(grouped).map((title) => ({
        title,
        count: grouped[title]?.length ?? 0,
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

    return data.filter((item) => matchWithPinyin(item.seasonTitle, filter))
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
                  label={t(`danmaku.type.${DanmakuSourceType[type]}`)}
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
