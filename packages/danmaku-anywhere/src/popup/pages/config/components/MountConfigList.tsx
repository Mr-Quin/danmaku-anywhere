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
import { ContentCopy, Delete, DragIndicator } from '@mui/icons-material'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NothingHere } from '@/common/components/NothingHere'
import { combinedPolicyService } from '@/common/options/combinedPolicy'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import {
  useEditMountConfig,
  useMountConfig,
} from '@/common/options/mountConfig/useMountConfig'
import { createDownload } from '@/common/utils/utils'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { ConfigToggleSwitch } from '@/popup/pages/config/components/ConfigToggleSwitch'
import { useStore } from '@/popup/store'

interface SortableItemProps {
  config: MountConfig
  index: number
  onEdit: (config: MountConfig) => void
  onDelete: (config: MountConfig) => void
  onExport: (id: string) => void
}

const SortableItem = ({
  config,
  index,
  onEdit,
  onDelete,
  onExport,
}: SortableItemProps) => {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      key={config.id}
      secondaryAction={
        <>
          <ConfigToggleSwitch config={config} />
          <DrilldownMenu
            BoxProps={{ display: 'inline' }}
            ButtonProps={{ edge: 'end' }}
          >
            <MenuItem onClick={() => onDelete(config)}>
              <ListItemIcon>
                <Delete />
              </ListItemIcon>
              <ListItemText>{t('common.delete')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => onExport(config.id)}>
              <ListItemIcon>
                <ContentCopy />
              </ListItemIcon>
              <ListItemText>{t('common.export')}</ListItemText>
            </MenuItem>
          </DrilldownMenu>
        </>
      }
      disablePadding
    >
      <ListItemButton onClick={() => onEdit(config)}>
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
        <ListItemText primary={config.name} secondary={config.patterns[0]} />
      </ListItemButton>
    </ListItem>
  )
}

interface DragOverlayItemProps {
  config: MountConfig
}

const DragOverlayItem = ({ config }: DragOverlayItemProps) => {
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
        <ListItemText primary={config.name} secondary={config.patterns[0]} />
      </ListItemButton>
    </ListItem>
  )
}

export const MountConfigList = ({
  onEdit,
}: {
  onEdit: (config: MountConfig) => void
}) => {
  const { configs } = useMountConfig()
  const { reorder } = useEditMountConfig()
  const [activeId, setActiveId] = useState<string | null>(null)

  const { setShowConfirmDeleteDialog, setEditingConfig } = useStore.use.config()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const exportConfig = useMutation({
    mutationFn: async (id: string) => {
      const config = await combinedPolicyService.export(id)
      await createDownload(
        new Blob([JSON.stringify(config, null, 2)], { type: 'text/json' }),
        `${config.name}.json`
      )
    },
  })

  const handleDelete = (config: MountConfig) => {
    setShowConfirmDeleteDialog(true)
    setEditingConfig(config)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = configs.findIndex((config) => config.id === active.id)
      const newIndex = configs.findIndex((config) => config.id === over?.id)

      reorder.mutate({
        sourceIndex: oldIndex,
        destinationIndex: newIndex,
      })
    }

    setActiveId(null)
  }

  const activeConfig = configs.find((config) => config.id === activeId)

  if (configs.length === 0) return <NothingHere />

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={configs.map((config) => config.id)}
        strategy={verticalListSortingStrategy}
      >
        <List dense disablePadding>
          {configs.map((config, index) => (
            <SortableItem
              key={config.id}
              config={config}
              index={index}
              onEdit={onEdit}
              onDelete={handleDelete}
              onExport={(id) => exportConfig.mutate(id)}
            />
          ))}
        </List>
      </SortableContext>
      <DragOverlay>
        {activeConfig && <DragOverlayItem config={activeConfig} />}
      </DragOverlay>
    </DndContext>
  )
}
