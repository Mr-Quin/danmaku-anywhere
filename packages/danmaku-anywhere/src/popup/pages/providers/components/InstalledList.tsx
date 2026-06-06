import {
  closestCenter,
  DndContext,
  type DragEndEvent,
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
import {
  Add,
  Delete,
  DragIndicator,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material'
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { NothingHere } from '@/common/components/NothingHere'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { flattenUnits, groupInstalled, type InstalledUnit } from '../catalog'

interface InstalledListProps {
  configs: ProviderConfig[]
  manifestById: Map<string, ProviderManifestInfo>
  reorderable: boolean
  filterActive: boolean
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
  onAddInstance: (manifestId: string) => void
}

function singleSubtitle(
  config: ProviderConfig,
  manifest?: ProviderManifestInfo
): string {
  if (manifest) {
    return `v${manifest.version}`
  }
  return (
    (config.configValues.danmakuBaseUrl as string) ??
    (config.configValues.baseUrl as string) ??
    ''
  )
}

const cardSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  overflow: 'hidden',
} as const

interface SortableUnitProps {
  unit: InstalledUnit
  reorderable: boolean
  expanded: boolean
  togglePending: boolean
  manifestById: Map<string, ProviderManifestInfo>
  onToggleExpand: (id: string) => void
  onToggleEnabled: (config: ProviderConfig) => void
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
  onAddInstance: (manifestId: string) => void
}

function SortableUnit({
  unit,
  reorderable,
  expanded,
  togglePending,
  manifestById,
  onToggleExpand,
  onToggleEnabled,
  onEdit,
  onDelete,
  onAddInstance,
}: SortableUnitProps) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id, disabled: !reorderable })

  const dragHandle = reorderable ? (
    <Box
      {...listeners}
      sx={{
        display: 'flex',
        color: 'text.disabled',
        cursor: 'grab',
        pr: 0.5,
        '& > svg': { fontSize: '1rem' },
      }}
    >
      <DragIndicator />
    </Box>
  ) : null

  const removeMenu = (config: ProviderConfig) => (
    <DrilldownMenu
      BoxProps={{ sx: { display: 'inline' } }}
      ButtonProps={{ edge: 'end', size: 'small' }}
      dense
      items={[
        {
          id: 'delete',
          label: t('common.delete', 'Delete'),
          onClick: () => onDelete(config),
          icon: <Delete />,
          color: 'error',
        },
      ]}
    />
  )

  const enableSwitch = (config: ProviderConfig) => (
    <Switch
      size="small"
      checked={config.enabled}
      disabled={togglePending}
      onChange={() => onToggleEnabled(config)}
    />
  )

  const wrapperStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (unit.type === 'single') {
    const config = unit.config
    return (
      <Box ref={setNodeRef} style={wrapperStyle} sx={cardSx} {...attributes}>
        <ListItem
          disablePadding
          secondaryAction={
            <>
              {enableSwitch(config)}
              {removeMenu(config)}
            </>
          }
        >
          <ListItemButton onClick={() => onEdit(config)}>
            {dragHandle}
            <ListItemText
              primary={config.name}
              secondary={singleSubtitle(
                config,
                manifestById.get(config.manifestId)
              )}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    )
  }

  const manifest = manifestById.get(unit.manifestId)
  const name = manifest?.name ?? unit.manifestId
  const count = t('providers.installed.instances', '{{count}} instances', {
    count: unit.configs.length,
  })
  const groupSubtitle = manifest ? `${count} · v${manifest.version}` : count

  return (
    <Box ref={setNodeRef} style={wrapperStyle} sx={cardSx} {...attributes}>
      <ListItem
        disablePadding
        secondaryAction={
          <DrilldownMenu
            BoxProps={{ sx: { display: 'inline' } }}
            ButtonProps={{ edge: 'end', size: 'small' }}
            dense
            items={[
              {
                id: 'add-instance',
                label: t('providers.installed.addInstance', 'Add instance'),
                onClick: () => onAddInstance(unit.manifestId),
                icon: <Add />,
              },
            ]}
          />
        }
      >
        <ListItemButton onClick={() => onToggleExpand(unit.id)}>
          {dragHandle}
          <ListItemText primary={name} secondary={groupSubtitle} />
          {expanded ? (
            <ExpandLess fontSize="small" color="action" />
          ) : (
            <ExpandMore fontSize="small" color="action" />
          )}
        </ListItemButton>
      </ListItem>
      <Collapse in={expanded} unmountOnExit>
        <List dense disablePadding sx={{ pl: 3 }}>
          {unit.configs.map((config) => (
            <ListItem
              key={config.id}
              disablePadding
              secondaryAction={
                <>
                  {enableSwitch(config)}
                  {removeMenu(config)}
                </>
              }
            >
              <ListItemButton onClick={() => onEdit(config)}>
                <ListItemText
                  primary={config.name}
                  secondary={(config.configValues.baseUrl as string) ?? ''}
                  slotProps={{
                    secondary: {
                      noWrap: true,
                      sx: { fontFamily: 'ui-monospace, monospace' },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  )
}

export const InstalledList = ({
  configs,
  manifestById,
  reorderable,
  filterActive,
  onEdit,
  onDelete,
  onAddInstance,
}: InstalledListProps) => {
  const { t } = useTranslation()
  const { toggle, reorderAll } = useEditProviderConfig()

  const [units, setUnits] = useState<InstalledUnit[]>(() =>
    groupInstalled(configs)
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    setUnits(groupInstalled(configs))
  }, [configs])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (!reorderable) {
      return
    }
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = units.findIndex((u) => u.id === active.id)
    const newIndex = units.findIndex((u) => u.id === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }
    const next = arrayMove(units, oldIndex, newIndex)
    setUnits(next)
    reorderAll.mutate(flattenUnits(next).map((config) => config.id))
  }

  const toggleExpand = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (units.length === 0) {
    return (
      <NothingHere
        message={
          filterActive
            ? t('providers.installed.empty', 'No matching sources')
            : t('providers.installed.none', 'No sources installed')
        }
        size={160}
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={units.map((u) => u.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack sx={{ gap: 1 }}>
          {units.map((unit) => (
            <SortableUnit
              key={unit.id}
              unit={unit}
              reorderable={reorderable}
              expanded={!collapsed.has(unit.id)}
              togglePending={toggle.isPending}
              manifestById={manifestById}
              onToggleExpand={toggleExpand}
              onToggleEnabled={(config) => toggle.mutate({ id: config.id })}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddInstance={onAddInstance}
            />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  )
}
