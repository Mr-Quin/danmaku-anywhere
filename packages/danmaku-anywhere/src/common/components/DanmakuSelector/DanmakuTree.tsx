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
import { DanmakuTreeItem } from '@/common/components/DanmakuSelector/items/DanmakuTreeItem'
import { useDanmakuTree } from '@/common/components/DanmakuSelector/useDanmakuTree'
import { NothingHere } from '@/common/components/NothingHere'
import { isNotCustom } from '@/common/danmaku/utils'

export interface DanmakuSelection {
  genericEpisodes: GenericEpisodeLite[]
  episodes: EpisodeLite[]
  customEpisodes: CustomEpisodeLite[]
  seasons: Season[]
}

function partitionEpisodes(
  genericEpisodes: GenericEpisodeLite[]
): DanmakuSelection {
  const episodes: EpisodeLite[] = []
  const customEpisodes: CustomEpisodeLite[] = []
  const seasons: Season[] = []

  for (const episode of genericEpisodes) {
    if (isNotCustom(episode)) {
      episodes.push(episode)
    } else {
      customEpisodes.push(episode)
    }
  }

  return {
    genericEpisodes,
    episodes,
    customEpisodes,
    seasons,
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
  onSelectionChange?: (selectedIds: string[]) => void
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [deletingDanmaku, setDeletingDanmaku] =
    useState<DanmakuDeleteProps | null>(null)

  const { treeItems, treeItemMap, episodeMap } = useDanmakuTree(
    filter,
    typeFilter
  )

  const apiRef = useTreeViewApiRef()

  useImperativeHandle(
    ref,
    () => ({
      getSelectedEpisodes: () => {
        return partitionEpisodes(selectedIds.map((id) => episodeMap[id]))
      },
      clearSelection: () => {
        setSelectedIds([])
        onSelectionChange?.([])
      },
    }),
    [selectedIds, episodeMap, onSelectionChange]
  )

  const handleSelectedItemsChange = (
    event: SyntheticEvent | null,
    ids: string | string[] | null
  ) => {
    if (multiselect) {
      const newIds = Array.isArray(ids) ? ids : ids ? [ids] : []
      // Filter out seasons if selected
      const episodeIds = newIds.filter(
        (id) => treeItemMap[id]?.kind === 'episode'
      )
      setSelectedIds(episodeIds)
      onSelectionChange?.(episodeIds)
    } else {
      if (!canMount) {
        return
      }
      // Single select
      if (typeof ids === 'string') {
        const item = treeItemMap[ids]
        if (item && item.kind === 'episode') {
          onSelect(item.data)
          setSelectedIds([ids])
        }
      }
    }
  }

  const contextValue = useMemo(
    () => ({
      itemMap: treeItemMap,
      setViewingDanmaku: onViewDanmaku,
      deletingDanmaku,
      setDeletingDanmaku,
      apiRef: apiRef.current as MUITreePublicApi,
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
          selectedItems={multiselect ? selectedIds : selectedIds[0] || null}
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
