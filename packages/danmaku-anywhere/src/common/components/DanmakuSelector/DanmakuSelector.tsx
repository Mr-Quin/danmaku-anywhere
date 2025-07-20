import {
  type CustomSeason,
  DanmakuSourceType,
  type EpisodeMeta,
  type GenericEpisodeLite,
  type Season,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Refresh } from '@mui/icons-material'
import {
  Box,
  Checkbox,
  IconButton,
  List,
  ListSubheader,
  Stack,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  memo,
  type Ref,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { NothingHere } from '@/common/components/NothingHere'
import { ProviderLogo } from '@/common/components/ProviderLogo'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesLiteSuspense } from '@/common/danmaku/queries/useEpisodes'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isNotCustom, isProvider } from '@/common/danmaku/utils'
import { matchWithPinyin } from '@/common/utils/utils'

export interface DanmakuSelectorApi {
  getSelectedEpisodes: () => GenericEpisodeLite[]
  clearSelection: () => void
}

type EpisodeListItemProps = {
  item: FlattenedOption
  onSelect: (value: GenericEpisodeLite) => void
  disabled?: boolean
  multiselect: boolean
  isSelected: boolean
  onToggleSelection: (episode: GenericEpisodeLite) => void
}

const EpisodeListItem = ({
  item,
  onSelect,
  disabled,
  multiselect = false,
  isSelected = false,
  onToggleSelection,
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
        if (multiselect) {
          onToggleSelection(meta)
        } else {
          onSelect(meta)
        }
      }}
      renderSecondaryAction={() => {
        const { episode } = item

        if (multiselect) {
          return (
            <Checkbox
              checked={isSelected}
              onChange={() => onToggleSelection?.(episode)}
              onClick={(e) => e.stopPropagation()}
              disabled={disabled}
            />
          )
        }

        if (!isNotCustom(episode)) return null

        return (
          <IconButton
            disabled={isPending}
            loading={isPending}
            onClick={() => handleFetchDanmaku(episode)}
          >
            <Refresh />
          </IconButton>
        )
      }}
    />
  )
}

const EpisodeListItemMemo = memo(EpisodeListItem)

const stringifyDanmakuMeta = (episode: GenericEpisodeLite) => {
  if (isProvider(episode, DanmakuSourceType.Custom)) {
    return episode.title
  }
  return `${episode.season.title} ${episode.title}`
}

const filterOptions = <T extends GenericEpisodeLite>(
  options: T[],
  filter: string,
  typeFilter: DanmakuSourceType[]
) => {
  if (!filter) {
    return options.filter((option) => {
      return typeFilter.includes(option.provider)
    })
  }

  return options.filter((option) => {
    if (!typeFilter.includes(option.provider)) return false
    return matchWithPinyin(
      stringifyDanmakuMeta(option),
      filter.toLocaleLowerCase()
    )
  })
}

type FlattenedOption =
  | {
      kind: 'season'
      season: Season | CustomSeason
    }
  | {
      kind: 'episode'
      episode: GenericEpisodeLite
    }

interface DanmakuSelectorProps {
  filter: string
  typeFilter: DanmakuSourceType[]
  onSelect: (value: GenericEpisodeLite) => void
  disabled?: boolean
  multiselect?: boolean
  ref: Ref<DanmakuSelectorApi>
}

export const DanmakuSelector = ({
  filter,
  typeFilter,
  onSelect,
  disabled,
  multiselect = false,
  ref,
}: DanmakuSelectorProps) => {
  const { t } = useTranslation()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedEpisodes, setSelectedEpisodes] = useState<
    Set<GenericEpisodeLite>
  >(new Set())

  const { data: episodes } = useEpisodesLiteSuspense()
  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })
  const { data: seasons } = useGetAllSeasonsSuspense()

  const handleToggleSelection = (episode: GenericEpisodeLite) => {
    setSelectedEpisodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(episode)) {
        newSet.delete(episode)
      } else {
        newSet.add(episode)
      }
      return newSet
    })
  }

  useImperativeHandle(
    ref,
    () => ({
      getSelectedEpisodes: () => {
        const allEpisodes = [...episodes, ...customEpisodes]
        return allEpisodes.filter((episode) => selectedEpisodes.has(episode))
      },
      clearSelection: () => {
        setSelectedEpisodes(new Set())
      },
    }),
    [episodes, customEpisodes, selectedEpisodes]
  )

  const flattened = useMemo(() => {
    const filteredEpisodes = filterOptions(episodes, filter, typeFilter)
    const groupedBySeason = Object.groupBy(
      filteredEpisodes,
      (item) => item.seasonId
    )

    const flattened: FlattenedOption[] = []

    const filteredCustomEpisodes = filterOptions(
      customEpisodes,
      filter,
      typeFilter
    )
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
  }, [episodes, customEpisodes, seasons, filter, typeFilter])

  const getKey = (item: FlattenedOption) => {
    if (item.kind === 'season') {
      return `season-${item.season.id}`
    }
    const episode = item.episode
    if (isNotCustom(episode)) {
      return `season-${episode.season.id}-episode-${episode.id}`
    }
    return `season-custom-episode-${episode.id}`
  }

  const getIsSelected = (item: FlattenedOption) => {
    if (item.kind === 'season') {
      return false
    }
    return selectedEpisodes.has(item.episode)
  }

  const virtualizer = useVirtualizer({
    count: flattened.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    getItemKey: (i) => getKey(flattened[i]),
  })

  if (flattened.length === 0) {
    return <NothingHere />
  }

  return (
    <Box height="100%" overflow="auto" ref={scrollRef}>
      <List
        sx={{
          height: virtualizer.getTotalSize(),
        }}
        disablePadding
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = flattened[virtualItem.index]

          const key = getKey(item)

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
              <EpisodeListItemMemo
                item={item}
                onSelect={onSelect}
                disabled={disabled}
                multiselect={multiselect}
                isSelected={getIsSelected(item)}
                onToggleSelection={handleToggleSelection}
              />
            </div>
          )
        })}
      </List>
    </Box>
  )
}
