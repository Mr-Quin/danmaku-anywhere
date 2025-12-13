import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
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
import { useDanmakuTreeContext } from '@/common/components/DanmakuSelector/tree/DanmakuTreeContext'
import { EpisodeTreeItem } from '@/common/components/DanmakuSelector/tree/items/EpisodeTreeItem'
import { SeasonTreeItem } from '@/common/components/DanmakuSelector/tree/items/SeasonTreeItem'
import { DanmakuContextMenu } from '@/common/components/DanmakuSelector/tree/menus/DanmakuContextMenu'
import { useLongPress } from '@/common/hooks/useLongPress'
import { FolderTreeItem } from './FolderTreeItem'

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

  const { itemMap, apiRef, isMultiSelect, contextMenu, setContextMenu } =
    useDanmakuTreeContext()

  const item = itemMap.get(itemId)
  const isSeason = item?.kind === 'season'
  const isCustomSeason = isSeason
    ? item.data.provider === DanmakuSourceType.MacCMS
    : false

  function handleMouseEnter() {
    setHovering(true)
  }

  function handleMouseLeave() {
    setHovering(false)
  }

  function handleContentClick() {
    if (isMultiSelect && !isSeason && item?.kind !== 'folder') {
      apiRef?.current?.setItemSelection({ itemId, keepExistingSelection: true })
    }
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      itemId,
      position: {
        top: event.clientY,
        left: event.clientX,
      },
    })
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
    if (item.kind === 'folder') {
      return (
        <FolderTreeItem
          label={item.label}
          childrenCount={item.children?.length}
        />
      )
    }
    return <EpisodeTreeItem episode={item.data} label={item.label} />
  }, [item, label])

  const bindLongPress = useLongPress({
    onLongPress: ({ xy }) => {
      setContextMenu({
        itemId,
        position: {
          top: xy[1],
          left: xy[0],
        },
      })
    },
  })

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <StyledTreeRoot
        {...getRootProps({
          ...other,
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
          sx: {
            borderBottom: (theme) =>
              isCustomSeason ? `1px solid ${theme.palette.divider}` : undefined,
          },
        })}
      >
        <StyledTreeContent
          {...getContentProps({
            ...bindLongPress(),
            onClick: handleContentClick,
            onContextMenu: handleContextMenu,
          })}
        >
          <TreeItemIconContainer {...getIconContainerProps()}>
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemCheckbox {...getCheckboxProps()} size="small" />
          <TreeItemLabel {...getLabelProps()}>{customLabel}</TreeItemLabel>
          <TreeItemDragAndDropOverlay {...getDragAndDropOverlayProps()} />
        </StyledTreeContent>
        {item && (hovering || contextMenu?.itemId === itemId) && (
          <DanmakuContextMenu item={item} />
        )}
        {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
      </StyledTreeRoot>
    </TreeItemProvider>
  )
})
