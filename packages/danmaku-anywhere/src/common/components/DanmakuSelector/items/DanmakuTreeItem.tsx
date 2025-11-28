import { styled } from '@mui/material'
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
import { forwardRef, type Ref, useMemo, useState } from 'react'
import { useDanmakuTreeContext } from '@/common/components/DanmakuSelector/DanmakuTreeContext'
import { EpisodeTreeItem } from '@/common/components/DanmakuSelector/items/EpisodeTreeItem'
import { SeasonTreeItem } from '@/common/components/DanmakuSelector/items/SeasonTreeItem'
import { DanmakuContextMenu } from '@/common/components/DanmakuSelector/menus/DanmakuContextMenu'

const StyledTreeRoot = styled(TreeItemRoot)({
  position: 'relative',
})

const StyledTreeContent = styled(TreeItemContent)({
  height: '40px',
  paddingRight: '32px',
})

interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, 'rootRef'>,
    Omit<React.HTMLAttributes<HTMLLIElement>, 'onFocus'> {}

export const DanmakuTreeItem = forwardRef(function CustomTreeItem(
  props: CustomTreeItemProps,
  ref: Ref<HTMLLIElement>
) {
  const { id, itemId, label, disabled, children, ...other } = props

  const [hovering, setHovering] = useState(false)

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

  const { itemMap, apiRef, isMultiSelect } = useDanmakuTreeContext()

  const item = itemMap.get(itemId)
  const isSeason = item?.kind === 'season'

  function handleMouseEnter() {
    setHovering(true)
  }

  function handleMouseLeave() {
    setHovering(false)
  }

  function handleContentClick() {
    if (isMultiSelect && !isSeason) {
      apiRef?.current?.setItemSelection({ itemId, keepExistingSelection: true })
    }
  }

  const customLabel = useMemo(() => {
    if (!item) {
      return label
    }
    if (isSeason) {
      return (
        <SeasonTreeItem
          season={item.data}
          provider={item.provider}
          childrenCount={item.children?.length}
        />
      )
    }
    return <EpisodeTreeItem episode={item.data} />
  }, [item, label])

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <StyledTreeRoot
        {...getRootProps({
          ...other,
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
        })}
      >
        <StyledTreeContent
          {...getContentProps({
            onClick: handleContentClick,
          })}
        >
          <TreeItemIconContainer {...getIconContainerProps()}>
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemCheckbox {...getCheckboxProps()} size="small" />
          <TreeItemLabel {...getLabelProps()}>{customLabel}</TreeItemLabel>
          <TreeItemDragAndDropOverlay {...getDragAndDropOverlayProps()} />
        </StyledTreeContent>
        {item && hovering && <DanmakuContextMenu item={item} />}
        {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
      </StyledTreeRoot>
    </TreeItemProvider>
  )
})
