import {
  Box,
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

import { DanmakuProviderChip } from '@/common/components/DanmakuProviderChip'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'
import { matchWithPinyin } from '@/common/utils/utils'
import { useStore } from '@/popup/store'

interface AnimeListProps {
  scrollElement: HTMLDivElement
}

// TODO: move to background service
const partitionDanmaku = (
  danmakuTypes: DanmakuSourceType[],
  data: DanmakuLite[]
) => {
  return danmakuTypes
    .map((type) => {
      // filter by type
      const items = data.filter((item) => item.provider === type)

      // group by anime title
      const grouped = Object.groupBy(
        items,
        (item) => item.seasonId ?? item.seasonTitle
      )

      // map to type and count
      const titles = Object.keys(grouped).map((title) => {
        const episodes = grouped[title]

        return {
          title,
          count: episodes?.length ?? 0,
          seasonId: title,
          seasonTitle: episodes?.[0].seasonTitle ?? title,
          type,
        }
      })

      return {
        items: titles,
      }
    })
    .flatMap((item) => item.items)
    .toSorted((a, b) => {
      if (a.type === b.type) {
        return a.title.localeCompare(b.title)
      }
      return a.type - b.type
    })
}

export const AnimeList = ({ scrollElement }: AnimeListProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data, isFetching } = useAllDanmakuSuspense()

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
    getItemKey: (index) => {
      const { seasonId } = titles[index]
      return seasonId
    },
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
          const { type, count, seasonId, seasonTitle } =
            titles[virtualItem.index]

          return (
            <ListItemButton
              key={seasonId}
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
                setSelectedAnime(seasonTitle)
              }}
            >
              <Tooltip title={seasonTitle}>
                <ListItemText
                  primary={seasonTitle}
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
                <DanmakuProviderChip provider={type} />
              </ListItemIcon>
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )
}
