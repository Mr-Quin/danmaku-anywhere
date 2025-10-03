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
import { useState } from 'react'
import { NothingHere } from '@/common/components/NothingHere'

interface DraggableItem {
  id: string
}

interface SortableItemProps<T extends DraggableItem> {
  item: T
  index: number
  onEdit: (item: T) => void
  renderPrimary: (item: T) => ReactNode
  renderSecondary?: (item: T) => ReactNode
  renderSecondaryAction: (item: T) => ReactNode
}

function SortableItem<T extends DraggableItem>({
  item,
  index,
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
  }

  if (renderSecondary) {
    listItemTextProps.secondary = renderSecondary(item)
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      key={item.id}
      secondaryAction={renderSecondaryAction(item)}
      disablePadding
    >
      <ListItemButton onClick={() => onEdit(item)}>
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
      </ListItemButton>
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
  }

  if (renderSecondary) {
    listItemTextProps.secondary = renderSecondary(item)
  }

  return (
    <ListItem
      sx={{
        backgroundColor: 'background.paper',
        boxShadow: 3,
        borderRadius: 1,
        opacity: 0.8,
      }}
      disablePadding
    >
      <ListItemButton>
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

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over?.id)

      onReorder(oldIndex, newIndex)
    }

    setActiveId(null)
  }

  const activeItem = items.find((item) => item.id === activeId)

  if (items.length === 0) {
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
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <List dense disablePadding>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
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
