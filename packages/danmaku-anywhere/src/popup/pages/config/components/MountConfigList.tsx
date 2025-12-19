import { Delete, ErrorOutline, Share } from '@mui/icons-material'
import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { DraggableList } from '@/common/components/DraggableList'
import { ListItemPrimaryStack } from '@/common/components/ListItemPrimaryStack'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { useToast } from '@/common/components/Toast/toastStore'
import { useExportShareCode } from '@/common/options/combinedPolicy/useExportShareCode'
import { integrationData } from '@/common/options/mountConfig/integrationData'
import { isConfigIncomplete } from '@/common/options/mountConfig/isPermissive'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import {
  useEditMountConfig,
  useMountConfig,
} from '@/common/options/mountConfig/useMountConfig'
import { ConfigToggleSwitch } from '@/popup/pages/config/components/ConfigToggleSwitch'
import { EmptyMountConfigList } from '@/popup/pages/config/components/EmptyMountConfigList'

const ConfigBadge = ({ config }: { config: MountConfig }) => {
  const { t } = useTranslation()

  switch (config.mode) {
    case 'ai':
      return (
        <Chip
          size="small"
          label={integrationData.ai.label()}
          color="secondary"
          variant="filled"
          icon={<integrationData.ai.icon />}
        />
      )
    case 'xpath':
      if (!config.integration) {
        return (
          <Chip
            size="small"
            label={t(
              'configPage.editor.integrationMode.setupIncomplete',
              'Setup Incomplete'
            )}
            color="warning"
            variant="filled"
            icon={<ErrorOutline />}
          />
        )
      }
      return (
        <Chip
          size="small"
          label={integrationData.xpath.label()}
          color="primary"
          variant="filled"
        />
      )
    default:
      return (
        <Chip
          size="small"
          label={integrationData.manual.label()}
          variant="filled"
        />
      )
  }
}

interface MountConfigListProps {
  onEdit: (config: MountConfig) => void
  onAdd: () => void
}

export const MountConfigList = ({ onEdit, onAdd }: MountConfigListProps) => {
  const { t } = useTranslation()
  const { configs } = useMountConfig()
  const { reorder, remove } = useEditMountConfig()
  const dialog = useDialog()
  const toast = useToast.use.toast()

  const handleExportShare = useExportShareCode()

  const handleDelete = (config: MountConfig) => {
    dialog.delete({
      title: t('common.confirmDeleteTitle', 'Confirm delete'),
      content: t(
        'common.confirmDeleteMessage',
        'Are you sure you want to delete "{{name}}"?',
        { name: config.name }
      ),
      confirmText: t('common.delete', 'Delete'),
      onConfirm: async () => {
        if (!config.id) return
        await remove.mutateAsync(config.id, {
          onSuccess: () => {
            toast.success(t('configs.alert.deleted', 'Config Deleted'))
          },
          onError: (e) => {
            toast.error(
              t(
                'configs.alert.deleteError',
                'Failed to delete config: {{message}}',
                { message: e.message }
              )
            )
          },
        })
      },
    })
  }

  return (
    <DraggableList
      items={configs}
      onEdit={onEdit}
      onReorder={(sourceIndex, destinationIndex) => {
        reorder.mutate({ sourceIndex, destinationIndex })
      }}
      renderEmpty={() => <EmptyMountConfigList onCreate={onAdd} />}
      renderPrimary={(config) => (
        <ListItemPrimaryStack text={config.name}>
          <ConfigBadge config={config} />
        </ListItemPrimaryStack>
      )}
      renderSecondary={(config) => config.patterns[0]}
      renderSecondaryAction={(config) => {
        const menuItems: DAMenuItemConfig[] = [
          {
            id: 'delete',
            label: t('common.delete', 'Delete'),
            onClick: () => handleDelete(config),
            color: 'error',
            icon: <Delete />,
          },
        ]

        if (config.mode === 'xpath' && !isConfigIncomplete(config)) {
          menuItems.unshift({
            id: 'share',
            label: t('configPage.copyShareCode', 'Copy Share Code'),
            onClick: () => handleExportShare(config),
            icon: <Share />,
          })
          menuItems.splice(1, 0, {
            kind: 'separator',
            id: 'separator',
          })
        }
        return (
          <>
            <ConfigToggleSwitch config={config} />
            <DrilldownMenu
              BoxProps={{ display: 'inline' }}
              ButtonProps={{ edge: 'end', size: 'small' }}
              dense
              items={menuItems}
            />
          </>
        )
      }}
    />
  )
}
