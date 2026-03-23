import type {
  CustomEpisodeLite,
  DanmakuSourceType,
  EpisodeLite,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { useTreeViewApiRef } from '@mui/x-tree-view/hooks'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import {
  type Ref,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import {
  DanmakuTreeContext,
  type DanmakuTreeContextMenuState,
  type MUITreePublicApi,
} from '@/common/components/DanmakuSelector/tree/DanmakuTreeContext'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/tree/ExtendedTreeItem'
import { DanmakuTreeItem } from '@/common/components/DanmakuSelector/tree/items/DanmakuTreeItem'
import {
  type TreeSortBy,
  useDanmakuTree,
} from '@/common/components/DanmakuSelector/tree/useDanmakuTree'
import { isNotCustom } from '@/common/danmaku/utils'
import { EmptyDanmakuTree } from '../components/EmptyDanmakuTree'

export interface DanmakuSelection {
  allEpisodes: GenericEpisodeLite[]
  episodes: EpisodeLite[]
  customEpisodes: CustomEpisodeLite[]
  seasons: Season[]
  count: number
}

function buildSelection(
  ids: string[],
  treeItemMap: Map<string, ExtendedTreeItem>
): DanmakuSelection {
  const allEpisodes: GenericEpisodeLite[] = []
  // regular episodes. if a season is selected, this will not include the episodes in the season
  const episodes: EpisodeLite[] = []
  const customEpisodes: CustomEpisodeLite[] = []
  const seasons: Season[] = []

  let count = 0

  const countedEpisodeIds = new Set<string>()
  const seasonEpisodeIds = new Set<string>()

  const countEpisode = (episodeId: string) => {
    if (countedEpisodeIds.has(episodeId)) {
      return
    }
    countedEpisodeIds.add(episodeId)
    count += 1
  }

  // first pass to build seasonEpisodeIds
  for (const id of ids) {
    const item = treeItemMap.get(id)
    if (!item) {
      continue
    }
    if (item.kind === 'season' && isNotCustom(item.data)) {
      seasons.push(item.data)
      const children = item.children ?? []
      for (const child of children) {
        if (child.kind !== 'episode') {
          continue
        }
        seasonEpisodeIds.add(child.id)
        countEpisode(child.id)
      }
    } else if (item.kind === 'episode') {
      allEpisodes.push(item.data)
    }
  }

  for (const id of ids) {
    const item = treeItemMap.get(id)
    if (!item || item.kind !== 'episode' || seasonEpisodeIds.has(id)) {
      continue
    }
    countEpisode(id)
    const episode = item.data

    if (isNotCustom(episode)) {
      episodes.push(episode)
    } else {
      customEpisodes.push(episode)
    }
  }

  return {
    allEpisodes,
    episodes,
    customEpisodes,
    seasons,
    count,
  }
}

const selectionPropagation = { descendants: true, parents: true }

const EXPANDED_ITEMS_KEY = 'danmaku-tree-expanded-items'

const readExpandedItems = (): string[] => {
  try {
    const saved = localStorage.getItem(EXPANDED_ITEMS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export interface DanmakuTreeApi {
  getSelectedEpisodes: () => DanmakuSelection
  clearSelection: () => void
  selectAll: () => void
}

interface DanmakuSelectorProps {
  filter: string
  typeFilter: DanmakuSourceType[]
  sortBy?: TreeSortBy
  onSelect: (value: GenericEpisodeLite) => void
  onViewDanmaku: (value: GenericEpisodeLite) => void
  onSelectionChange?: (selection: string[]) => void
  onImport: () => void
  onGoSearch: () => void
  canMount?: boolean
  multiselect?: boolean
  ref: Ref<DanmakuTreeApi>
}

export const DanmakuTree = ({
  filter,
  typeFilter,
  sortBy,
  onSelect,
  onViewDanmaku,
  onSelectionChange,
  canMount = true,
  multiselect = false,
  onImport,
  onGoSearch,
  ref,
}: DanmakuSelectorProps): React.ReactElement => {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [expandedItems, setExpandedItems] =
    useState<string[]>(readExpandedItems)
  const [contextMenu, setContextMenu] =
    useState<DanmakuTreeContextMenuState | null>(null)

  const { treeItems, treeItemMap } = useDanmakuTree(filter, typeFilter, sortBy)

  const apiRef = useTreeViewApiRef()

  useImperativeHandle(
    ref,
    () => ({
      getSelectedEpisodes: () => {
        return buildSelection(selectedNodeIds, treeItemMap)
      },
      clearSelection: () => {
        setSelectedNodeIds([])
        onSelectionChange?.([])
      },
      selectAll: () => {
        const episodeIds: string[] = []
        function collectEpisodes(items: ExtendedTreeItem[]) {
          for (const item of items) {
            if (item.kind === 'episode') {
              episodeIds.push(item.id)
            }
            if (item.children) {
              collectEpisodes(item.children)
            }
          }
        }
        collectEpisodes(treeItems)
        setSelectedNodeIds(episodeIds)
        onSelectionChange?.(episodeIds)
      },
    }),
    [selectedNodeIds, treeItemMap, onSelectionChange, treeItems]
  )

  const handleExpandedItemsChange = useCallback(
    (_event: SyntheticEvent | null, itemIds: string[]) => {
      setExpandedItems(itemIds)
      try {
        localStorage.setItem(EXPANDED_ITEMS_KEY, JSON.stringify(itemIds))
      } catch {
        // Ignore storage errors
      }
    },
    []
  )

  const handleSelectedItemsChange = (
    event: SyntheticEvent | null,
    ids: string | string[] | null
  ) => {
    if (multiselect) {
      const newIds = Array.isArray(ids) ? ids : ids ? [ids] : []
      setSelectedNodeIds(newIds)
      onSelectionChange?.(newIds)
      return
    }
    if (!canMount) {
      return
    }
    // Single select
    if (typeof ids === 'string') {
      const item = treeItemMap.get(ids)
      if (item && item.kind === 'episode') {
        onSelect(item.data)
        setSelectedNodeIds([ids])
      }
    }
  }

  const contextValue = useMemo(
    () => ({
      itemMap: treeItemMap,
      setViewingDanmaku: onViewDanmaku,
      apiRef: apiRef as RefObject<MUITreePublicApi>,
      isMultiSelect: multiselect,
      contextMenu,
      setContextMenu,
    }),
    [treeItemMap, apiRef, onViewDanmaku, multiselect, contextMenu]
  )

  if (treeItems.length === 0) {
    return <EmptyDanmakuTree onImport={onImport} onGoSearch={onGoSearch} />
  }

  return (
    <DanmakuTreeContext.Provider value={contextValue}>
      <RichTreeView
        items={treeItems}
        multiSelect={multiselect}
        checkboxSelection={multiselect}
        selectedItems={
          multiselect ? selectedNodeIds : selectedNodeIds[0] || null
        }
        expandedItems={expandedItems}
        onExpandedItemsChange={handleExpandedItemsChange}
        selectionPropagation={selectionPropagation}
        onSelectedItemsChange={handleSelectedItemsChange}
        slots={{ item: DanmakuTreeItem }}
        apiRef={apiRef}
      />
    </DanmakuTreeContext.Provider>
  )
}
