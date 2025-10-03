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
import { Delete, DragIndicator } from '@mui/icons-material'
import {
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NothingHere } from '@/common/components/NothingHere'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { useStore } from '@/popup/store'
import { ProviderToggleSwitch } from './ProviderToggleSwitch'

interface SortableItemProps {
  config: ProviderConfig
  index: number
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
}

const SortableItem = ({
  config,
  index,
  onEdit,
  onDelete,
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

  const getSecondaryText = () => {
    if (config.isBuiltIn) {
      return t('providers.builtin')
    }
    if (config.type === 'DanDanPlayCompatible') {
      return config.options.baseUrl
    }
    if (config.type === 'MacCMS') {
      return config.options.danmakuBaseUrl
    }
    return ''
  }

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      key={config.id}
      secondaryAction={
        <>
          <ProviderToggleSwitch config={config} />
          {!config.isBuiltIn && (
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
            </DrilldownMenu>
          )}
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
        <ListItemText
          primary={
            <span>
              {config.name}
              {config.isBuiltIn && (
                <Chip
                  label={t('providers.builtin')}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </span>
          }
          secondary={getSecondaryText()}
        />
      </ListItemButton>
    </ListItem>
  )
}

interface DragOverlayItemProps {
  config: ProviderConfig
}

const DragOverlayItem = ({ config }: DragOverlayItemProps) => {
  const { t } = useTranslation()
  const isBuiltIn = config.type.startsWith('builtin-')

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
        <ListItemText
          primary={
            <span>
              {config.name}
              {isBuiltIn && (
                <Chip
                  label={t('providers.builtin')}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </span>
          }
        />
      </ListItemButton>
    </ListItem>
  )
}

export const ProviderConfigList = ({
  onEdit,
}: {
  onEdit: (config: ProviderConfig) => void
}) => {
  const { configs } = useProviderConfig()
  const { reorder } = useEditProviderConfig()
  const [activeId, setActiveId] = useState<string | null>(null)

  const { setShowConfirmDeleteDialog, setEditingProvider } =
    useStore.use.providers()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDelete = (config: ProviderConfig) => {
    setShowConfirmDeleteDialog(true)
    setEditingProvider(config)
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
