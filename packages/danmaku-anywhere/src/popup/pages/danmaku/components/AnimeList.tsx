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
import { createSearchParams, useNavigate } from 'react-router'

import { NoAnime } from './NoAnime'

import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { DanmakuProviderChip } from '@/common/components/DanmakuProviderChip'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import { EpisodeLiteV4, WithSeason } from '@/common/danmaku/types/v4/schema'
import { matchWithPinyin } from '@/common/utils/utils'
import { useStore } from '@/popup/store'

interface AnimeListProps {
  scrollElement: HTMLDivElement
}

// TODO: move to background service
const partitionDanmaku = (
  danmakuTypes: DanmakuSourceType[],
  data: WithSeason<EpisodeLiteV4>[]
) => {
  return danmakuTypes
    .map((type) => {
      // filter by type
      const items = data.filter((item) => item.provider === type)

      // group by anime title
      const grouped = Object.groupBy(items, (item) => item.seasonId.toString())

      // map to type and count
      const titles = Object.keys(grouped).map((seasonId) => {
        const episodes = grouped[seasonId]

        return {
          title: seasonId,
          count: episodes?.length ?? 0,
          seasonId: seasonId,
          seasonTitle: episodes?.[0].season.title ?? seasonId,
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
      return a.type.localeCompare(b.type)
    })
}

export const AnimeList = ({ scrollElement }: AnimeListProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data, isFetching } = useGetAllSeasonsSuspense()

  const {
    animeFilter: filter,
    setSelectedAnime,
    selectedTypes,
  } = useStore.use.danmaku()

  const filteredData = useMemo(() => {
    if (!filter) return data

    return data.filter((item) => matchWithPinyin(item.title, filter))
  }, [data, filter])

  const titles = useMemo(() => {
    return data.filter((item) => selectedTypes.includes(item.provider))
  }, [selectedTypes, filteredData])

  const virtualizer = useVirtualizer({
    count: titles.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 72,
    getItemKey: (index) => {
      return titles[index].id
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
          const { provider, id, title } = titles[virtualItem.index]

          return (
            <ListItemButton
              key={id}
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
                    type: provider.toString(),
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
                        count: 0,
                      })}
                    </Typography>
                  }
                  slotProps={{
                    primary: {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
              </Tooltip>
              <ListItemIcon>
                <DanmakuProviderChip provider={provider} />
              </ListItemIcon>
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )
}
