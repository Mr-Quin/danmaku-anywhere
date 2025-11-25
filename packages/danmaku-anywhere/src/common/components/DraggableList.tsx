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
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DragIndicator } from '@mui/icons-material'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  type ListItemTextProps,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NothingHere } from '@/common/components/NothingHere'

interface DraggableItem {
  id: string
}

interface SortableItemProps<T extends DraggableItem> {
  item: T
  clickable?: boolean
  onEdit: (item: T) => void
  renderPrimary: (item: T) => ReactNode
  renderSecondary?: (item: T) => ReactNode
  renderSecondaryAction: (item: T) => ReactNode
}

function SortableItem<T extends DraggableItem>({
  item,
  clickable = true,
  onEdit,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const listItemTextProps: ListItemTextProps = {
    primary: renderPrimary(item),
    secondary: renderSecondary?.(item),
  }

  const listItemInner = (
    <>
      <ListItemIcon
        sx={{
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
        {...attributes}
        {...listeners}
      >
        <DragIndicator />
      </ListItemIcon>
      <ListItemText {...listItemTextProps} />
    </>
  )

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      key={item.id}
      secondaryAction={renderSecondaryAction(item)}
      disablePadding={clickable}
    >
      {clickable ? (
        <ListItemButton onClick={() => onEdit(item)}>
          {listItemInner}
        </ListItemButton>
      ) : (
        listItemInner
      )}
    </ListItem>
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
        boxShadow: 3,
        borderRadius: 1,
        opacity: 0.85,
      }}
      disablePadding
    >
      <ListItemButton disableRipple>
        <ListItemIcon>
          <DragIndicator />
        </ListItemIcon>
        <ListItemText {...listItemTextProps} />
      </ListItemButton>
    </ListItem>
  )
}

export interface DraggableListProps<T extends DraggableItem> {
  items: T[]
  onEdit: (item: T) => void
  onReorder: (sourceIndex: number, destinationIndex: number) => void
  renderPrimary: (item: T) => ReactNode
  renderSecondary?: (item: T) => ReactNode
  renderSecondaryAction: (item: T) => ReactNode
}

export function DraggableList<T extends DraggableItem>({
  items,
  onEdit,
  onReorder,
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

      onReorder(oldIndex, newIndex)
    }

    setActiveId(null)
  }

  const activeItem = orderedItems.find((item) => item.id === activeId)

  if (orderedItems.length === 0) {
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
        <List dense disablePadding>
          {orderedItems.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onEdit={onEdit}
              renderPrimary={renderPrimary}
              renderSecondary={renderSecondary}
              renderSecondaryAction={renderSecondaryAction}
            />
          ))}
        </List>
      </SortableContext>
      <DragOverlay>
        {activeItem && (
          <DragOverlayItem
            item={activeItem}
            renderPrimary={renderPrimary}
            renderSecondary={renderSecondary}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
