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
  ButtonBase,
  Collapse,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HashAvatar } from '@/common/components/HashAvatar'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { NothingHere } from '@/common/components/NothingHere'
import { useToast } from '@/common/components/Toast/toastStore'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { groupInstalled, type InstalledUnit } from '../catalog'

interface InstalledListProps {
  configs: ProviderConfig[]
  manifestById: Map<string, ProviderManifestInfo>
  reorderMode: boolean
  filterActive: boolean
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
  onAddInstance: (manifestId: string) => void
}

function versionSubtitle(
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

interface RowProps {
  avatarSeed?: string
  name: string
  subtitle: string
  mono?: boolean
  leading?: ReactNode
  endIcon?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
}

// Text area truncates (minWidth:0 + noWrap); the trailing actions are flex
// siblings, not absolutely positioned, so they never overlap the text.
function Row({
  avatarSeed,
  name,
  subtitle,
  mono,
  leading,
  endIcon,
  trailing,
  onClick,
}: RowProps) {
  const contentSx = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 1.25,
    px: 1,
    py: 0.75,
    borderRadius: 1,
  } as const

  const content = (
    <>
      {avatarSeed !== undefined ? (
        <HashAvatar seed={avatarSeed} label={name} />
      ) : null}
      <Stack sx={{ minWidth: 0, alignItems: 'flex-start' }}>
        <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
          {name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{
            maxWidth: '100%',
            fontFamily: mono ? 'ui-monospace, monospace' : undefined,
          }}
        >
          {subtitle}
        </Typography>
      </Stack>
      {endIcon}
    </>
  )

  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, pr: 1 }}>
      {leading}
      {onClick ? (
        <ButtonBase onClick={onClick} sx={contentSx}>
          {content}
        </ButtonBase>
      ) : (
        <Box sx={contentSx}>{content}</Box>
      )}
      {trailing}
    </Stack>
  )
}

function FlatSortableRow({
  config,
  manifestById,
}: {
  config: ProviderConfig
  manifestById: Map<string, ProviderManifestInfo>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id })
  const subtitle =
    (config.configValues.baseUrl as string) ??
    versionSubtitle(config, manifestById.get(config.manifestId))
  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      sx={cardSx}
    >
      <Row
        avatarSeed={config.manifestId}
        name={config.name}
        subtitle={subtitle}
        leading={
          <Box
            {...attributes}
            {...listeners}
            sx={{
              display: 'flex',
              pl: 0.5,
              color: 'text.disabled',
              cursor: 'grab',
              '& > svg': { fontSize: '1rem' },
            }}
          >
            <DragIndicator />
          </Box>
        }
      />
    </Box>
  )
}

export const InstalledList = ({
  configs,
  manifestById,
  reorderMode,
  filterActive,
  onEdit,
  onDelete,
  onAddInstance,
}: InstalledListProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { toggle, reorderAll } = useEditProviderConfig()

  const [order, setOrder] = useState<ProviderConfig[]>(configs)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    setOrder(configs)
  }, [configs])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = order.findIndex((c) => c.id === active.id)
    const newIndex = order.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }
    const next = arrayMove(order, oldIndex, newIndex)
    setOrder(next)
    reorderAll.mutate(
      next.map((c) => c.id),
      {
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  if (configs.length === 0) {
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

  if (reorderMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={order.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack sx={{ gap: 1 }}>
            {order.map((config) => (
              <FlatSortableRow
                key={config.id}
                config={config}
                manifestById={manifestById}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
    )
  }

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
      disabled={toggle.isPending}
      onChange={() => toggle.mutate({ id: config.id })}
    />
  )

  const renderUnit = (unit: InstalledUnit) => {
    if (unit.type === 'single') {
      const config = unit.config
      return (
        <Box key={unit.id} sx={cardSx}>
          <Row
            avatarSeed={config.manifestId}
            name={config.name}
            subtitle={versionSubtitle(
              config,
              manifestById.get(config.manifestId)
            )}
            onClick={() => onEdit(config)}
            trailing={
              <>
                {enableSwitch(config)}
                {removeMenu(config)}
              </>
            }
          />
        </Box>
      )
    }

    const manifest = manifestById.get(unit.manifestId)
    const name = manifest?.name ?? unit.manifestId
    const count = t('providers.installed.instances', '{{count}} instances', {
      count: unit.configs.length,
    })
    const isOpen = !collapsed.has(unit.id)
    return (
      <Box key={unit.id} sx={cardSx}>
        <Row
          avatarSeed={unit.manifestId}
          name={name}
          subtitle={manifest ? `${count} · v${manifest.version}` : count}
          onClick={() =>
            setCollapsed((prev) => {
              const next = new Set(prev)
              if (next.has(unit.id)) {
                next.delete(unit.id)
              } else {
                next.add(unit.id)
              }
              return next
            })
          }
          endIcon={
            isOpen ? (
              <ExpandLess fontSize="small" color="action" />
            ) : (
              <ExpandMore fontSize="small" color="action" />
            )
          }
          trailing={
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
        />
        <Collapse in={isOpen} unmountOnExit>
          <Stack sx={{ bgcolor: 'action.hover', py: 0.5 }}>
            {unit.configs.map((config) => (
              <Row
                key={config.id}
                name={config.name}
                subtitle={(config.configValues.baseUrl as string) ?? ''}
                mono
                onClick={() => onEdit(config)}
                leading={
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: 'text.disabled',
                      mx: 1,
                      flexShrink: 0,
                    }}
                  />
                }
                trailing={
                  <>
                    {enableSwitch(config)}
                    {removeMenu(config)}
                  </>
                }
              />
            ))}
          </Stack>
        </Collapse>
      </Box>
    )
  }

  return (
    <Stack sx={{ gap: 1 }}>{groupInstalled(configs).map(renderUnit)}</Stack>
  )
}
