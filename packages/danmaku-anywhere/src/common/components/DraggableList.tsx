import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DragIndicator } from '@mui/icons-material'
import {
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  type ListItemTextProps,
  styled,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { NothingHere } from '@/common/components/NothingHere'
import { ScrollBox } from './layout/ScrollBox'

const DraggableItemIcon = styled(ListItemIcon)(({ theme }) => {
  return {
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
    minWidth: 0,
    paddingRight: theme.spacing(1),
    alignSelf: 'stretch',
    ['& > svg']: {
      margin: 'auto',
    },
  }
})

const StyledListItem = styled(ListItem)(({ theme }) => {
  return {
    '.MuiListItemButton-root': {
      paddingRight: theme.spacing(12), // make room for action buttons
    },
  }
})

interface DraggableItem {
  id: string
}

interface SortableItemProps<T extends DraggableItem> {
  item: T
  clickable?: boolean
  disableReorder?: boolean
  multiselect?: boolean
  selected?: boolean
  onEdit?: (item: T) => void
  onToggleSelect?: (item: T) => void
  renderPrimary: (item: T) => ReactNode
  renderSecondary?: (item: T) => ReactNode
  renderSecondaryAction?: (item: T) => ReactNode
}

function SortableItem<T extends DraggableItem>({
  item,
  clickable = true,
  disableReorder,
  multiselect,
  selected,
  onEdit,
  onToggleSelect,
  renderPrimary,
  renderSecondary,
  renderSecondaryAction,
}: SortableItemProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  function handleClick() {
    if (multiselect) {
      onToggleSelect?.(item)
    } else {
      onEdit?.(item)
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const listItemTextProps: ListItemTextProps = {
    primary: renderPrimary(item),
    secondary: renderSecondary?.(item),
  }

  const isClickable = multiselect || clickable

  const listItemInner = (
    <>
      {multiselect ? (
        <ListItemIcon sx={{ minWidth: 0 }}>
          <Checkbox
            edge="start"
            checked={selected}
            disableRipple
            tabIndex={-1}
            size="small"
            sx={{ py: 0 }}
          />
        </ListItemIcon>
      ) : !disableReorder ? (
        <DraggableItemIcon {...listeners}>
          <DragIndicator />
        </DraggableItemIcon>
      ) : null}
      <ListItemText {...listItemTextProps} />
    </>
  )

  return (
    <StyledListItem
      ref={setNodeRef}
      style={style}
      key={item.id}
      secondaryAction={
        multiselect
          ? null
          : renderSecondaryAction
            ? renderSecondaryAction(item)
            : null
      }
      disablePadding={isClickable}
      {...attributes}
    >
      {isClickable ? (
        <ListItemButton onClick={handleClick}>{listItemInner}</ListItemButton>
      ) : (
        listItemInner
      )}
    </StyledListItem>
  )
}

interface DragOverlayItemProps<T extends DraggableItem> {
  item: T
  renderPrimary: (item: T) => ReactNode
  renderSecondary?: (item: T) => ReactNode
}

function DragOverlayItem<T extends DraggableItem>({
  item,
  renderPrimary,
  renderSecondary,
}: DragOverlayItemProps<T>) {
  const listItemTextProps: ListItemTextProps = {
    primary: renderPrimary(item),
    secondary: renderSecondary?.(item),
  }

  return (
    <ListItem
      sx={{
        backgroundColor: 'background.paper',
        opacity: 0.85,
      }}
    >
      <DraggableItemIcon>
        <DragIndicator />
      </DraggableItemIcon>
      <ListItemText {...listItemTextProps} />
    </ListItem>
  )
}

export interface DraggableListProps<T extends DraggableItem> {
  items: T[]
  clickable?: boolean | ((item: T) => boolean)
  multiselect?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onEdit?: (item: T) => void
  onReorder?: (sourceIndex: number, destinationIndex: number) => void
  renderPrimary: (item: T) => ReactNode
  renderSecondary?: (item: T) => ReactNode
  renderSecondaryAction?: (item: T) => ReactNode
  renderEmpty?: () => ReactNode
  overlayPortal?: Element | null
  disableReorder?: boolean
}

export function DraggableList<T extends DraggableItem>({
  items,
  clickable,
  multiselect,
  selectedIds,
  onSelectionChange,
  overlayPortal,
  disableReorder,
  onEdit,
  onReorder,
  renderEmpty,
  renderPrimary,
  renderSecondary,
  renderSecondaryAction,
}: DraggableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [orderedItems, setOrderedItems] = useState(items)

  useEffect(() => {
    setOrderedItems(items)
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const oldIndex = orderedItems.findIndex((item) => item.id === active.id)
    const newIndex = orderedItems.findIndex((item) => item.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setOrderedItems((prev) => {
        const currentOldIndex = prev.findIndex((item) => item.id === active.id)
        const currentNewIndex = prev.findIndex((item) => item.id === over.id)

        if (
          currentOldIndex === -1 ||
          currentNewIndex === -1 ||
          currentOldIndex === currentNewIndex
        ) {
          return prev
        }

        return arrayMove(prev, currentOldIndex, currentNewIndex)
      })

      onReorder?.(oldIndex, newIndex)
    }

    setActiveId(null)
  }

  const selectedIdSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds])

  function handleToggleSelect(item: T) {
    if (!onSelectionChange) {
      return
    }
    const currentIds = selectedIds ?? []
    if (selectedIdSet.has(item.id)) {
      onSelectionChange(currentIds.filter((id) => id !== item.id))
    } else {
      onSelectionChange([...currentIds, item.id])
    }
  }

  function getIsClickable(item: T) {
    return typeof clickable === 'function' ? clickable(item) : clickable
  }

  function renderDragOverlay() {
    const activeItem = orderedItems.find((item) => item.id === activeId)

    const element = (
      <DragOverlay>
        {activeItem && (
          <DragOverlayItem
            item={activeItem}
            renderPrimary={renderPrimary}
            renderSecondary={renderSecondary}
          />
        )}
      </DragOverlay>
    )
    if (overlayPortal) {
      return createPortal(element, overlayPortal)
    }
    return element
  }

  if (orderedItems.length === 0) {
    if (renderEmpty) {
      return renderEmpty()
    }
    return <NothingHere />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ScrollBox overflow="auto">
          <List dense disablePadding>
            {orderedItems.map((item) => (
              <SortableItem
                key={item.id}
                clickable={getIsClickable(item)}
                item={item}
                disableReorder={multiselect || disableReorder}
                multiselect={multiselect}
                selected={selectedIdSet.has(item.id)}
                onEdit={onEdit}
                onToggleSelect={handleToggleSelect}
                renderPrimary={renderPrimary}
                renderSecondary={renderSecondary}
                renderSecondaryAction={renderSecondaryAction}
              />
            ))}
          </List>
        </ScrollBox>
      </SortableContext>
      {renderDragOverlay()}
    </DndContext>
  )
}
