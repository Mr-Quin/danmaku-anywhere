import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItemIcon,
  ListSubheader,
  Stack,
} from '@mui/material'
import { useMemo } from 'react'

import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { ProviderLogo } from '@/common/components/ProviderLogo'
import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { matchWithPinyin } from '@/common/utils/utils'
import type { Season } from '@danmaku-anywhere/danmaku-converter'
import type {
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Refresh } from '@mui/icons-material'

type ListItemProps = {
  item: FlattenedOption
  onSelect: (value: SelectableEpisode) => void
  disabled?: boolean
}
const ListItem = ({ item, onSelect, disabled }: ListItemProps) => {
  const { mutateAsync: load, isPending } = useFetchDanmaku()

  const handleFetchDanmaku = async (meta: WithSeason<EpisodeMeta>) => {
    return await load({
      meta,
      options: {
        forceUpdate: true,
      },
    })
  }

  if (item.kind === 'season') {
    return (
      <ListSubheader title={item.season.title}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Box
            component="span"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {item.season.title}
          </Box>
          <ProviderLogo provider={item.season.provider} />
        </Stack>
      </ListSubheader>
    )
  }

  return (
    <BaseEpisodeListItem
      showImage={false}
      disabled={disabled}
      episode={item.episode}
      onClick={(meta) => {
        onSelect(meta)
      }}
      renderIcon={() => {
        return (
          <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
            {isPending ? (
              <CircularProgress size={24} />
            ) : (
              <IconButton onClick={() => handleFetchDanmaku(item.episode)}>
                <Refresh />
              </IconButton>
            )}
          </ListItemIcon>
        )
      }}
    />
  )
}

const stringifyDanmakuMeta = (danmakuLite: SelectableEpisode) => {
  return `${danmakuLite.season.title} ${danmakuLite.title}`
}

const filterOptions = (options: SelectableEpisode[], filter: string) => {
  if (!filter) return options
  return options.filter((option) => {
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      filter.toLocaleLowerCase()
    )
  })
}

type SelectableEpisode = WithSeason<EpisodeLite>

type FlattenedOption =
  | {
      kind: 'season'
      season: Season
    }
  | {
      kind: 'episode'
      episode: WithSeason<EpisodeLite>
    }

interface DanmakuSelectorProps {
  filter: string
  onSelect: (value: SelectableEpisode) => void
  disabled?: boolean
}

export const DanmakuSelector = ({
  filter,
  onSelect,
  disabled,
}: DanmakuSelectorProps) => {
  const { data: episodes } = useAllDanmakuSuspense()
  const { data: seasons } = useGetAllSeasonsSuspense()

  const flattened = useMemo(() => {
    const filteredEpisodes = filterOptions(episodes, filter)
    const groupedBySeason = Object.groupBy(
      filteredEpisodes,
      (item) => item.seasonId
    )

    const flattened: FlattenedOption[] = []

    Object.entries(groupedBySeason).forEach(([seasonId, episodeGroup]) => {
      const season = seasons.find((season) => season.id.toString() === seasonId)

      if (!season) return

      flattened.push({
        kind: 'season',
        season: season,
      })
      episodeGroup?.forEach((episode) => {
        flattened.push({
          kind: 'episode',
          episode: episode,
        })
      })
    })

    return flattened
  }, [episodes, filter])

  return (
    <Box height="100%" overflow="auto">
      <List disablePadding>
        {flattened.map((item) => {
          const key =
            item.kind === 'season'
              ? `season${item.season.id}`
              : `episode${item.episode.id}`

          return (
            <ListItem
              item={item}
              onSelect={onSelect}
              disabled={disabled}
              key={key}
            />
          )
        })}
      </List>
    </Box>
  )
}
