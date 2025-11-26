import {
  type CustomSeason,
  DanmakuSourceType,
  type EpisodeMeta,
  type GenericEpisodeLite,
  type Season,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Sync } from '@mui/icons-material'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { TreeViewBaseItem } from '@mui/x-tree-view/models'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import type { TreeItemProps } from '@mui/x-tree-view/TreeItem'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import React, {
  createContext,
  forwardRef,
  type Ref,
  type SyntheticEvent,
  useContext,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { NothingHere } from '@/common/components/NothingHere'
import { ProviderLogo } from '@/common/components/ProviderLogo'
import { useCustomEpisodeLiteSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesLiteSuspense } from '@/common/danmaku/queries/useEpisodes'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isNotCustom, isProvider } from '@/common/danmaku/utils'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { matchWithPinyin } from '@/common/utils/utils'

export interface DanmakuSelectorApi {
  getSelectedEpisodes: () => GenericEpisodeLite[]
  clearSelection: () => void
}

interface DanmakuSelectorProps {
  filter: string
  typeFilter: DanmakuSourceType[]
  onSelect: (value: GenericEpisodeLite) => void
  disabled?: boolean
  multiselect?: boolean
  ref: Ref<DanmakuSelectorApi>
}

// Extended Tree Item to include data
interface ExtendedTreeItem extends TreeViewBaseItem {
  kind: 'season' | 'episode'
  data: Season | CustomSeason | GenericEpisodeLite
  children?: ExtendedTreeItem[]
}

// Context to pass item data to CustomTreeItem without prop drilling through library components
const ItemContext = createContext<Record<string, ExtendedTreeItem>>({})

const SeasonLabel = ({
  season,
  count,
}: {
  season: Season | CustomSeason
  count?: number
}) => {
  const { getProviderById } = useProviderConfig()

  const provider = isNotCustom(season)
    ? getProviderById(season.providerConfigId)
    : undefined

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      overflow="hidden"
    >
      <Stack direction="row" spacing={1} alignItems="center" overflow="hidden">
        {season.imageUrl && (
          <Box
            component="img"
            src={season.imageUrl}
            alt={season.title}
            sx={{
              width: 32,
              height: 48,
              objectFit: 'cover',
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
        )}
        <Typography noWrap variant="body2">
          {season.title} {count !== undefined && `(${count})`}
        </Typography>
      </Stack>
      <Box flexShrink={0}>
        {provider && !provider.isBuiltIn ? (
          <Typography variant="caption" color="text.secondary">
            {provider.name}
          </Typography>
        ) : (
          <ProviderLogo provider={season.provider} />
        )}
      </Box>
    </Stack>
  )
}

const EpisodeLabel = ({ episode }: { episode: GenericEpisodeLite }) => {
  const { t } = useTranslation()
  const { mutateAsync: load, isPending } = useFetchDanmaku()

  const handleFetchDanmaku = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isNotCustom(episode)) return

    await load({
      type: 'by-meta',
      meta: episode as WithSeason<EpisodeMeta>,
      options: {
        forceUpdate: true,
      },
    })
  }

  // Only show sync for standard provider episodes
  const showSync = isNotCustom(episode)

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      py={0.5}
      overflow="hidden"
    >
      <Typography noWrap variant="body2" sx={{ flex: 1 }}>
        {episode.title}
      </Typography>
      {showSync && (
        <Tooltip title={t('danmaku.refresh')}>
          <IconButton
            size="small"
            disabled={isPending}
            onClick={handleFetchDanmaku}
            sx={{ ml: 1 }}
          >
            <Sync fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  )
}

const CustomTreeItem = forwardRef<HTMLLIElement, TreeItemProps>(
  (props, ref) => {
    const { itemId, label, ...other } = props
    const itemMap = useContext(ItemContext)
    const item = itemMap[itemId]

    if (!item) {
      return <TreeItem ref={ref} itemId={itemId} label={label} {...other} />
    }

    const customLabel =
      item.kind === 'season' ? (
        <SeasonLabel
          season={item.data as Season | CustomSeason}
          count={item.children?.length}
        />
      ) : (
        <EpisodeLabel episode={item.data as GenericEpisodeLite} />
      )

    return <TreeItem ref={ref} itemId={itemId} label={customLabel} {...other} />
  }
)

const stringifyDanmakuMeta = (episode: GenericEpisodeLite) => {
  if (isProvider(episode, DanmakuSourceType.MacCMS)) {
    return episode.title
  }
  return `${episode.season.title} ${episode.title}`
}

const filterEpisodes = <T extends GenericEpisodeLite>(
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

export const DanmakuSelector = ({
  filter,
  typeFilter,
  onSelect,
  disabled,
  multiselect = false,
  ref,
}: DanmakuSelectorProps): React.ReactElement => {
  const { t } = useTranslation()
  const { data: episodes } = useEpisodesLiteSuspense()
  const { data: customEpisodes } = useCustomEpisodeLiteSuspense({ all: true })
  const { data: seasons } = useGetAllSeasonsSuspense()

  // Controlled selection state
  // We use string IDs for RichTreeView
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { items, itemMap, episodeMap } = useMemo(() => {
    const itemMap: Record<string, ExtendedTreeItem> = {}
    const episodeMap: Record<string, GenericEpisodeLite> = {}
    const treeItems: ExtendedTreeItem[] = []

    const register = (item: ExtendedTreeItem) => {
      itemMap[item.id] = item
      if (item.kind === 'episode') {
        episodeMap[item.id] = item.data as GenericEpisodeLite
      }
      return item
    }

    const filteredEpisodes = filterEpisodes(episodes, filter, typeFilter)
    const filteredCustomEpisodes = filterEpisodes(
      customEpisodes,
      filter,
      typeFilter
    )

    // Handle Custom Episodes (Local)
    if (filteredCustomEpisodes.length > 0) {
      const children = filteredCustomEpisodes.map((ep) =>
        register({
          id: `custom-episode-${ep.id}`,
          label: ep.title,
          kind: 'episode',
          data: ep,
        })
      )

      const customSeason: CustomSeason = {
        title: t('danmaku.local'),
        type: t('danmaku.local'),
        indexedId: '',
        schemaVersion: 1,
        version: 0,
        timeUpdated: 0,
        id: -1,
        provider: DanmakuSourceType.MacCMS,
        providerIds: {},
      }

      treeItems.push(
        register({
          id: 'season-custom',
          label: t('danmaku.local'),
          kind: 'season',
          data: customSeason,
          children,
        })
      )
    }

    // Handle Regular Seasons
    const groupedBySeason = Object.groupBy(
      filteredEpisodes,
      (item) => item.seasonId
    )

    Object.entries(groupedBySeason).forEach(([seasonId, groupEpisodes]) => {
      const season = seasons.find((s) => s.id.toString() === seasonId)
      if (!season || !groupEpisodes) return

      const children = groupEpisodes.map((ep) =>
        register({
          id: `episode-${ep.id}`,
          label: ep.title,
          kind: 'episode',
          data: ep,
        })
      )

      treeItems.push(
        register({
          id: `season-${season.id}`,
          label: season.title,
          kind: 'season',
          data: season,
          children,
        })
      )
    })

    return { items: treeItems, itemMap, episodeMap }
  }, [episodes, customEpisodes, seasons, filter, typeFilter, t])

  useImperativeHandle(
    ref,
    () => ({
      getSelectedEpisodes: () => {
        return selectedIds
          .map((id) => episodeMap[id])
          .filter((ep): ep is GenericEpisodeLite => !!ep)
      },
      clearSelection: () => {
        setSelectedIds([])
      },
    }),
    [selectedIds, episodeMap]
  )

  const handleSelectedItemsChange = (
    event: SyntheticEvent | null,
    ids: string | string[] | null
  ) => {
    if (disabled) return

    if (multiselect) {
      const newIds = Array.isArray(ids) ? ids : ids ? [ids] : []
      // Filter out seasons if selected
      const episodeIds = newIds.filter((id) => itemMap[id]?.kind === 'episode')
      setSelectedIds(episodeIds)
    } else {
      // Single select
      if (typeof ids === 'string') {
        const item = itemMap[ids]
        if (item && item.kind === 'episode') {
          onSelect(item.data as GenericEpisodeLite)
          // Optionally update selection state if we want to show it
          // setSelectedIds([ids])
        }
      }
    }
  }

  if (items.length === 0) {
    return <NothingHere />
  }

  return (
    <ItemContext.Provider value={itemMap}>
      <Box sx={{ height: '100%', overflowY: 'auto' }}>
        <RichTreeView
          items={items}
          multiSelect={multiselect}
          checkboxSelection={multiselect}
          selectedItems={multiselect ? selectedIds : selectedIds[0] || null}
          onSelectedItemsChange={handleSelectedItemsChange}
          slots={{ item: CustomTreeItem }}
          isItemDisabled={(item) =>
            disabled ? (item as ExtendedTreeItem).kind === 'episode' : false
          }
        />
      </Box>
    </ItemContext.Provider>
  )
}
