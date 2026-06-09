import { arrayMove } from '@dnd-kit/sortable'
import {
  Add,
  Code,
  Delete,
  ExpandLess,
  ExpandMore,
  Restore,
} from '@mui/icons-material'
import { Box, Chip, Collapse, Stack, Switch } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { HashAvatar } from '@/common/components/HashAvatar'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { NothingHere } from '@/common/components/NothingHere'
import { useToast } from '@/common/components/Toast/toastStore'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import { groupInstalled, isHostedDanDanPlay } from '../catalog'
import { ProviderRow, sourceCardSx } from './ProviderRow'

interface InstalledListProps {
  configs: ProviderConfig[]
  manifestById: Map<string, ProviderManifestInfo>
  reorderMode: boolean
  filterActive: boolean
  onEdit: (config: ProviderConfig) => void
  onDelete: (config: ProviderConfig) => void
  onAddInstance: (manifestId: string) => void
  onAddDefaultInstance: (manifestId: string) => void
  onViewSource: (manifestId: string) => void
}

function versionSubtitle(
  config: ProviderConfig,
  manifest?: ProviderManifestInfo
): string {
  if (manifest) {
    return `v${manifest.version}`
  }
  // Only legacy MacCMS has no manifest; show its base URL in place of a version.
  return (config.configValues.danmakuBaseUrl as string) ?? ''
}

export const InstalledList = ({
  configs,
  manifestById,
  reorderMode,
  filterActive,
  onEdit,
  onDelete,
  onAddInstance,
  onAddDefaultInstance,
  onViewSource,
}: InstalledListProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { toggle, reorderAll } = useEditProviderConfig()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const displayName = (config: ProviderConfig) =>
    isHostedDanDanPlay(config)
      ? `${config.name} (${t('providers.installed.builtIn', 'Built-in')})`
      : config.name

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
      <DraggableList
        items={configs}
        onReorder={(source, destination) => {
          reorderAll.mutate(
            arrayMove(configs, source, destination).map((c) => c.id),
            {
              onError: (error) => {
                toast.error(error.message)
              },
            }
          )
        }}
        renderLeading={(config) => (
          <Box sx={{ mr: 1.5, display: 'flex' }}>
            <HashAvatar seed={config.manifestId} label={config.name} />
          </Box>
        )}
        renderPrimary={(config) => displayName(config)}
        renderSecondary={(config) =>
          (config.configValues.baseUrl as string) ??
          versionSubtitle(config, manifestById.get(config.manifestId))
        }
      />
    )
  }

  // View source is a manifest-level action, so it appears once per manifest
  // (single row or group header), never on the per-instance rows in a group.
  const configMenu = (config: ProviderConfig, showViewSource: boolean) => {
    const items: DAMenuItemConfig[] = []
    if (showViewSource && manifestById.has(config.manifestId)) {
      items.push({
        id: 'view-source',
        label: t('providers.editor.manifest.viewSource', 'View source'),
        onClick: () => onViewSource(config.manifestId),
        icon: <Code />,
      })
    }
    items.push({
      id: 'delete',
      label: t('common.delete', 'Delete'),
      onClick: () => onDelete(config),
      icon: <Delete />,
      color: 'error',
    })
    return (
      <DrilldownMenu
        BoxProps={{ sx: { display: 'inline' } }}
        ButtonProps={{ edge: 'end', size: 'small' }}
        dense
        items={items}
      />
    )
  }

  const kindChip = (manifestId: string) => {
    if (manifestById.get(manifestId)?.kind !== 'user') {
      return null
    }
    return (
      <Chip
        size="small"
        variant="outlined"
        label={t('providers.installed.custom', 'Custom')}
        sx={{ height: 20 }}
      />
    )
  }

  const enableSwitch = (config: ProviderConfig) => (
    <Switch
      size="small"
      checked={config.enabled}
      disabled={toggle.isPending}
      onChange={() => toggle.mutate({ id: config.id })}
    />
  )

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

  return (
    <Stack sx={{ gap: 1 }}>
      {groupInstalled(configs).map((unit) => {
        if (unit.type === 'single') {
          const config = unit.config
          return (
            <Box key={unit.id} sx={sourceCardSx}>
              <ProviderRow
                avatarSeed={config.manifestId}
                primary={displayName(config)}
                secondary={versionSubtitle(
                  config,
                  manifestById.get(config.manifestId)
                )}
                onClick={() => onEdit(config)}
                action={
                  <>
                    {kindChip(config.manifestId)}
                    {enableSwitch(config)}
                    {configMenu(config, true)}
                  </>
                }
              />
            </Box>
          )
        }

        const manifest = manifestById.get(unit.manifestId)
        const name = manifest?.name ?? unit.manifestId
        const count = t(
          'providers.installed.instances',
          '{{count}} instances',
          {
            count: unit.configs.length,
          }
        )
        const isOpen = !collapsed.has(unit.id)
        const menuItems: DAMenuItemConfig[] = [
          {
            id: 'add-instance',
            label: t('providers.installed.addInstance', 'Add instance'),
            onClick: () => onAddInstance(unit.manifestId),
            icon: <Add />,
          },
        ]
        if (manifestById.has(unit.manifestId)) {
          menuItems.push({
            id: 'view-source',
            label: t('providers.editor.manifest.viewSource', 'View source'),
            onClick: () => onViewSource(unit.manifestId),
            icon: <Code />,
          })
        }
        if (!unit.configs.some(isHostedDanDanPlay)) {
          menuItems.push({
            id: 'add-default',
            label: t(
              'providers.installed.addDefaultInstance',
              'Add default instance'
            ),
            onClick: () => onAddDefaultInstance(unit.manifestId),
            icon: <Restore />,
          })
        }
        return (
          <Box key={unit.id} sx={sourceCardSx}>
            <ProviderRow
              avatarSeed={unit.manifestId}
              primary={name}
              secondary={manifest ? `${count} · v${manifest.version}` : count}
              onClick={() => toggleCollapsed(unit.id)}
              action={
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                  {kindChip(unit.manifestId)}
                  {isOpen ? (
                    <ExpandLess fontSize="small" color="action" />
                  ) : (
                    <ExpandMore fontSize="small" color="action" />
                  )}
                  <DrilldownMenu
                    BoxProps={{ sx: { display: 'inline' } }}
                    ButtonProps={{ edge: 'end', size: 'small' }}
                    dense
                    items={menuItems}
                  />
                </Stack>
              }
            />
            <Collapse in={isOpen} unmountOnExit>
              <Box sx={{ bgcolor: (theme) => theme.palette.paperAlt, pl: 2 }}>
                {unit.configs.map((config) => (
                  <ProviderRow
                    key={config.id}
                    dense
                    primary={displayName(config)}
                    secondary={(config.configValues.baseUrl as string) ?? ''}
                    mono
                    onClick={() => onEdit(config)}
                    action={
                      <>
                        {enableSwitch(config)}
                        {configMenu(config, false)}
                      </>
                    }
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        )
      })}
    </Stack>
  )
}
