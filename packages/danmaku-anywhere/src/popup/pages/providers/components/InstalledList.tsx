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
  Button,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { NothingHere } from '@/common/components/NothingHere'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { flattenUnits, groupInstalled, type InstalledUnit } from '../catalog'
import { ProviderAvatar } from './ProviderAvatar'

interface InstalledListProps {
  configs: ProviderConfig[]
  manifestById: Map<string, ProviderManifestInfo>
  reorderable: boolean
  filterActive: boolean
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
  onAddInstance: (manifestId: string) => void
}

function useSubtitles() {
  const { t } = useTranslation()

  const capabilities = (manifest: ProviderManifestInfo): string[] => {
    const parts: string[] = []
    if (manifest.capabilities.search) {
      parts.push(t('providers.caps.search', 'Search'))
    }
    if (manifest.capabilities.comments) {
      parts.push(t('providers.caps.comments', 'comments'))
    }
    return parts
  }

  const single = (
    config: ProviderConfig,
    manifest?: ProviderManifestInfo
  ): string => {
    if (manifest) {
      return [...capabilities(manifest), `v${manifest.version}`].join(' · ')
    }
    return (
      (config.configValues.danmakuBaseUrl as string) ??
      (config.configValues.baseUrl as string) ??
      ''
    )
  }

  const group = (count: number, manifest?: ProviderManifestInfo): string => {
    const instances = t(
      'providers.installed.instances',
      '{{count}} instances',
      {
        count,
      }
    )
    return manifest ? `${instances} · v${manifest.version}` : instances
  }

  return { single, group }
}

interface RowShellProps {
  unitId: string
  reorderable: boolean
  header: ReactNode
  footer?: ReactNode
}

function RowShell({ unitId, reorderable, header, footer }: RowShellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unitId })

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
      {...attributes}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, p: 1 }}>
        {reorderable ? (
          <Box
            {...listeners}
            sx={{
              display: 'flex',
              color: 'text.disabled',
              cursor: 'grab',
              '& > svg': { fontSize: '1rem' },
            }}
          >
            <DragIndicator />
          </Box>
        ) : null}
        {header}
      </Stack>
      {footer}
    </Box>
  )
}

function NameStack({
  name,
  subtitle,
  mono,
}: {
  name: string
  subtitle: string
  mono?: boolean
}) {
  return (
    <Stack sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap title={name}>
        {name}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        sx={mono ? { fontFamily: 'ui-monospace, monospace' } : undefined}
      >
        {subtitle}
      </Typography>
    </Stack>
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
  const subtitles = useSubtitles()

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
    // Reorder is disabled while filtering: `units` is then a subset and a
    // persisted order would drop the hidden configs.
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

  const handleToggle = (config: ProviderConfig) => {
    toggle.mutate({ id: config.id })
  }

  const toggleCollapsed = (id: string) => {
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

  const renderDeleteMenu = (config: ProviderConfig) => (
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
        <List
          dense
          disablePadding
          sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
        >
          {units.map((unit) => {
            if (unit.type === 'single') {
              const config = unit.config
              return (
                <ListItem
                  key={unit.id}
                  disablePadding
                  sx={{ display: 'block' }}
                >
                  <RowShell
                    unitId={unit.id}
                    reorderable={reorderable}
                    header={
                      <>
                        <ProviderAvatar
                          seed={config.manifestId}
                          name={config.name}
                        />
                        <ListItemButton
                          onClick={() => onEdit(config)}
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            borderRadius: 1,
                            py: 0.25,
                          }}
                        >
                          <NameStack
                            name={config.name}
                            subtitle={subtitles.single(
                              config,
                              manifestById.get(config.manifestId)
                            )}
                          />
                        </ListItemButton>
                        <Switch
                          size="small"
                          checked={config.enabled}
                          disabled={toggle.isPending}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleToggle(config)}
                        />
                        {renderDeleteMenu(config)}
                      </>
                    }
                  />
                </ListItem>
              )
            }

            const manifest = manifestById.get(unit.manifestId)
            const name = manifest?.name ?? unit.manifestId
            const isOpen = !collapsed.has(unit.id)
            return (
              <ListItem key={unit.id} disablePadding sx={{ display: 'block' }}>
                <RowShell
                  unitId={unit.id}
                  reorderable={reorderable}
                  header={
                    <>
                      <ProviderAvatar seed={unit.manifestId} name={name} />
                      <ListItemButton
                        onClick={() => toggleCollapsed(unit.id)}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          borderRadius: 1,
                          py: 0.25,
                          gap: 1,
                        }}
                      >
                        <NameStack
                          name={name}
                          subtitle={subtitles.group(
                            unit.configs.length,
                            manifest
                          )}
                        />
                        <Box sx={{ flex: 1 }} />
                        {isOpen ? (
                          <ExpandLess fontSize="small" color="action" />
                        ) : (
                          <ExpandMore fontSize="small" color="action" />
                        )}
                      </ListItemButton>
                    </>
                  }
                  footer={
                    <Collapse in={isOpen} unmountOnExit>
                      <Stack sx={{ pl: 3, pr: 1, pb: 0.5, gap: 0.25 }}>
                        {unit.configs.map((config) => (
                          <Stack
                            key={config.id}
                            direction="row"
                            sx={{ alignItems: 'center', gap: 1 }}
                          >
                            <ListItemButton
                              onClick={() => onEdit(config)}
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                borderRadius: 1,
                                py: 0.25,
                              }}
                            >
                              <NameStack
                                name={config.name}
                                subtitle={
                                  (config.configValues.baseUrl as string) ?? ''
                                }
                                mono
                              />
                            </ListItemButton>
                            <Switch
                              size="small"
                              checked={config.enabled}
                              disabled={toggle.isPending}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => handleToggle(config)}
                            />
                            {renderDeleteMenu(config)}
                          </Stack>
                        ))}
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => onAddInstance(unit.manifestId)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {t('providers.installed.addInstance', 'Add instance')}
                        </Button>
                      </Stack>
                    </Collapse>
                  }
                />
              </ListItem>
            )
          })}
        </List>
      </SortableContext>
    </DndContext>
  )
}
