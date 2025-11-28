import type {
  CustomEpisodeLite,
  DanmakuSourceType,
  EpisodeLite,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { useTreeViewApiRef } from '@mui/x-tree-view/hooks'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import {
  type Ref,
  type RefObject,
  type SyntheticEvent,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import {
  type DanmakuDeleteProps,
  DanmakuTreeContext,
  type MUITreePublicApi,
} from '@/common/components/DanmakuSelector/DanmakuTreeContext'
import { DeleteConfirmDialog } from '@/common/components/DanmakuSelector/dialogs/DeleteConfirmDialog'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/ExtendedTreeItem'
import { DanmakuTreeItem } from '@/common/components/DanmakuSelector/items/DanmakuTreeItem'
import { useDanmakuTree } from '@/common/components/DanmakuSelector/useDanmakuTree'
import { NothingHere } from '@/common/components/NothingHere'
import { isNotCustom } from '@/common/danmaku/utils'

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

export interface DanmakuTreeApi {
  getSelectedEpisodes: () => DanmakuSelection
  clearSelection: () => void
}

interface DanmakuSelectorProps {
  filter: string
  typeFilter: DanmakuSourceType[]
  onSelect: (value: GenericEpisodeLite) => void
  onViewDanmaku: (value: GenericEpisodeLite) => void
  onSelectionChange?: (selection: string[]) => void
  canMount?: boolean
  multiselect?: boolean
  ref: Ref<DanmakuTreeApi>
}

export const DanmakuTree = ({
  filter,
  typeFilter,
  onSelect,
  onViewDanmaku,
  onSelectionChange,
  canMount = true,
  multiselect = false,
  ref,
}: DanmakuSelectorProps): React.ReactElement => {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])

  const [deletingDanmaku, setDeletingDanmaku] =
    useState<DanmakuDeleteProps | null>(null)

  const { treeItems, treeItemMap } = useDanmakuTree(filter, typeFilter)

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
    }),
    [selectedNodeIds, treeItemMap, onSelectionChange]
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
      deletingDanmaku,
      setDeletingDanmaku,
      apiRef: apiRef as RefObject<MUITreePublicApi>,
      isMultiSelect: multiselect,
    }),
    [
      treeItemMap,
      apiRef,
      onViewDanmaku,
      deletingDanmaku,
      setDeletingDanmaku,
      multiselect,
    ]
  )

  if (treeItems.length === 0) {
    return <NothingHere />
  }

  return (
    <DanmakuTreeContext.Provider value={contextValue}>
      <Box sx={{ height: '100%', overflowY: 'auto' }}>
        <RichTreeView
          items={treeItems}
          multiSelect={multiselect}
          checkboxSelection={multiselect}
          selectedItems={
            multiselect ? selectedNodeIds : selectedNodeIds[0] || null
          }
          selectionPropagation={selectionPropagation}
          onSelectedItemsChange={handleSelectedItemsChange}
          slots={{ item: DanmakuTreeItem }}
          apiRef={apiRef}
        />
      </Box>
      <DeleteConfirmDialog />
    </DanmakuTreeContext.Provider>
  )
}
