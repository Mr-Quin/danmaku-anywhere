import type {
  CustomSeason,
  GenericEpisodeLite,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { Box, styled } from '@mui/material'
import {
  TreeItemCheckbox,
  TreeItemContent,
  TreeItemGroupTransition,
  TreeItemIconContainer,
  TreeItemLabel,
  TreeItemRoot,
} from '@mui/x-tree-view/TreeItem'
import { TreeItemDragAndDropOverlay } from '@mui/x-tree-view/TreeItemDragAndDropOverlay'
import { TreeItemIcon } from '@mui/x-tree-view/TreeItemIcon'
import { TreeItemProvider } from '@mui/x-tree-view/TreeItemProvider'
import {
  type UseTreeItemParameters,
  useTreeItem,
} from '@mui/x-tree-view/useTreeItem'
import { forwardRef, type Ref } from 'react'
import { useDanmakuTreeContext } from '@/common/components/DanmakuSelector/DanmakuTreeContext'
import { EpisodeTreeItem } from '@/common/components/DanmakuSelector/items/EpisodeTreeItem'
import { SeasonTreeItem } from '@/common/components/DanmakuSelector/items/SeasonTreeItem'
import { DanmakuContextMenu } from '@/common/components/DanmakuSelector/menus/DanmakuContextMenu'

const StyledTreeRoot = styled(TreeItemRoot)({
  position: 'relative',
})

interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, 'rootRef'>,
    Omit<React.HTMLAttributes<HTMLLIElement>, 'onFocus'> {}

export const DanmakuTreeItem = forwardRef(function CustomTreeItem(
  props: CustomTreeItemProps,
  ref: Ref<HTMLLIElement>
) {
  const { id, itemId, label, disabled, children, ...other } = props

  const {
    getContextProviderProps,
    getRootProps,
    getContentProps,
    getIconContainerProps,
    getCheckboxProps,
    getLabelProps,
    getGroupTransitionProps,
    getDragAndDropOverlayProps,
    status,
  } = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref })

  const { itemMap, onSelect } = useDanmakuTreeContext()
  const item = itemMap[itemId]

  const customLabel = !item ? (
    label
  ) : item.kind === 'season' ? (
    <SeasonTreeItem
      season={item.data as Season | CustomSeason}
      count={item.children?.length}
    />
  ) : (
    <EpisodeTreeItem
      episode={item.data as GenericEpisodeLite}
      onSelect={onSelect}
    />
  )

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <StyledTreeRoot {...getRootProps(other)}>
        <TreeItemContent {...getContentProps()}>
          <TreeItemIconContainer {...getIconContainerProps()}>
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemCheckbox {...getCheckboxProps()} />
          <TreeItemLabel {...getLabelProps()}>{customLabel}</TreeItemLabel>
          <TreeItemDragAndDropOverlay {...getDragAndDropOverlayProps()} />
        </TreeItemContent>
        {item && (
          <Box position="absolute" top={0} right={0}>
            <DanmakuContextMenu item={item} />
          </Box>
        )}
        {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
      </StyledTreeRoot>
    </TreeItemProvider>
  )
})
