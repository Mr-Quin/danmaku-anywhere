import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItemIcon,
  ListSubheader,
  Stack,
} from '@mui/material'
import { useMemo, useRef } from 'react'

import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { ProviderLogo } from '@/common/components/ProviderLogo'
import { useAllCustomEpisodesSuspense } from '@/common/danmaku/queries/useAllCustomEpisodes'
import { useAllDanmakuSuspense } from '@/common/danmaku/queries/useAllDanmakuSuspense'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isNotCustom, isProvider } from '@/common/danmaku/utils'
import { matchWithPinyin } from '@/common/utils/utils'
import {
  type CustomEpisode,
  type CustomSeason,
  DanmakuSourceType,
  type EpisodeLite,
  type EpisodeMeta,
  type Season,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Refresh } from '@mui/icons-material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'

type EpisodeListItemProps = {
  item: FlattenedOption
  onSelect: (value: SelectableEpisode) => void
  disabled?: boolean
}
const EpisodeListItem = ({
  item,
  onSelect,
  disabled,
}: EpisodeListItemProps) => {
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
        const { episode } = item

        if (!isNotCustom(episode)) return null

        return (
          <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
            {isPending ? (
              <CircularProgress size={24} />
            ) : (
              <IconButton onClick={() => handleFetchDanmaku(episode)}>
                <Refresh />
              </IconButton>
            )}
          </ListItemIcon>
        )
      }}
    />
  )
}

const stringifyDanmakuMeta = (episode: SelectableEpisode) => {
  if (isProvider(episode, DanmakuSourceType.Custom)) {
    return episode.title
  }
  return `${episode.season.title} ${episode.title}`
}

const filterOptions = <T extends SelectableEpisode>(
  options: T[],
  filter: string
) => {
  if (!filter) return options
  return options.filter((option) => {
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      filter.toLocaleLowerCase()
    )
  })
}

export type SelectableEpisode = WithSeason<EpisodeLite> | CustomEpisode

type FlattenedOption =
  | {
      kind: 'season'
      season: Season | CustomSeason
    }
  | {
      kind: 'episode'
      episode: WithSeason<EpisodeLite> | CustomEpisode
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
  const { t } = useTranslation()

  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: episodes } = useAllDanmakuSuspense()
  const { data: customEpisodes } = useAllCustomEpisodesSuspense()
  const { data: seasons } = useGetAllSeasonsSuspense()

  const flattened = useMemo(() => {
    const filteredEpisodes = filterOptions(episodes, filter)
    const groupedBySeason = Object.groupBy(
      filteredEpisodes,
      (item) => item.seasonId
    )

    const flattened: FlattenedOption[] = []

    const filteredCustomEpisodes = filterOptions(customEpisodes, filter)
    if (filteredCustomEpisodes.length) {
      flattened.push({
        kind: 'season',
        season: {
          title: t('danmaku.local'),
          type: t('danmaku.local'),
          indexedId: '',
          schemaVersion: 1,
          version: 0,
          timeUpdated: 0,
          id: -1,
          provider: DanmakuSourceType.Custom,
          providerIds: {},
        } satisfies CustomSeason,
      })
    }
    filteredCustomEpisodes.forEach((episode) => {
      flattened.push({
        kind: 'episode',
        episode,
      })
    })

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
          episode,
        })
      })
    })

    return flattened
  }, [episodes, customEpisodes, seasons, filter])

  const virtualizer = useVirtualizer({
    count: flattened.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
  })

  return (
    <Box height="100%" overflow="auto">
      <Box height={virtualizer.getTotalSize()} ref={scrollRef}>
        <List disablePadding>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = flattened[virtualItem.index]

            const key =
              item.kind === 'season'
                ? `season${item.season.id}`
                : `episode${item.episode.id}`

            return (
              <div
                key={key}
                data-index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                ref={virtualizer.measureElement}
              >
                <EpisodeListItem
                  item={item}
                  onSelect={onSelect}
                  disabled={disabled}
                />
              </div>
            )
          })}
        </List>
      </Box>
    </Box>
  )
}
