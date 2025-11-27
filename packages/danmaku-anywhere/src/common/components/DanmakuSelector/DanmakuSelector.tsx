import type {
  DanmakuSourceType,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
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
} from '@/common/components/DanmakuSelector/DanmakuTreeContext'
import type { ExtendedTreeItem } from '@/common/components/DanmakuSelector/ExtendedTreeItem'
import { DanmakuTreeItem } from '@/common/components/DanmakuSelector/items/DanmakuTreeItem'
import { useDanmakuTree } from '@/common/components/DanmakuSelector/useDanmakuTree'
import { NothingHere } from '@/common/components/NothingHere'

export interface DanmakuSelectorApi {
  getSelectedEpisodes: () => GenericEpisodeLite[]
  clearSelection: () => void
}

interface DanmakuSelectorProps {
  filter: string
  typeFilter: DanmakuSourceType[]
  onSelect: (value: GenericEpisodeLite) => void
  onViewDanmaku: (value: GenericEpisodeLite) => void
  disabled?: boolean
  multiselect?: boolean
  ref: Ref<DanmakuSelectorApi>
}

export const DanmakuSelector = ({
  filter,
  typeFilter,
  onSelect,
  onViewDanmaku,
  disabled,
  multiselect = false,
  ref,
}: DanmakuSelectorProps): React.ReactElement => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [, setDeletingDanmaku] = useState<DanmakuDeleteProps | null>(null)

  const { treeItems, treeItemMap, episodeMap } = useDanmakuTree(
    filter,
    typeFilter
  )

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
      const episodeIds = newIds.filter(
        (id) => treeItemMap[id]?.kind === 'episode'
      )
      setSelectedIds(episodeIds)
    } else {
      // Single select
      if (typeof ids === 'string') {
        const item = treeItemMap[ids]
        if (item && item.kind === 'episode') {
          // onSelect(item.data as GenericEpisodeLite) // Handled by Mount button now? Or click?
          // If we want click to select, keep this.
          // The user asked to change mount behavior to "disable individual episodes", implying click might select?
          // But we also added a "Mount" button in the menu.
          // Let's keep click-to-select for now as it's standard tree behavior.
          onSelect(item.data as GenericEpisodeLite)

          // Only update internal selection state if not controlled externally via props (which it isn't really, except via ref)
          // The previous code didn't update selectedIds on single select to avoid visual selection persistence if the action was "Mount" (run immediately)
          // But for tree view, showing selection is good.
          setSelectedIds([ids])
        }
      }
    }
  }

  const contextValue = useMemo(
    () => ({
      itemMap: treeItemMap,
      onSelect,
      setViewingDanmaku: onViewDanmaku,
      setDeletingDanmaku,
    }),
    [treeItemMap, onSelect, onViewDanmaku, setDeletingDanmaku]
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
          onSelectedItemsChange={handleSelectedItemsChange}
          slots={{ item: DanmakuTreeItem }}
          isItemDisabled={(item) =>
            disabled ? (item as ExtendedTreeItem).kind === 'episode' : false
          }
        />
      </Box>
    </DanmakuTreeContext.Provider>
  )
}
