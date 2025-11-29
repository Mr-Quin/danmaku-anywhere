import {
  AutoAwesome,
  CheckCircle,
  ContentCopy,
  Delete,
  ErrorOutline,
} from '@mui/icons-material'
import {
  Chip,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { DraggableList } from '@/common/components/DraggableList'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { useToast } from '@/common/components/Toast/toastStore'
import { combinedPolicyService } from '@/common/options/combinedPolicy'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import {
  useEditMountConfig,
  useMountConfig,
} from '@/common/options/mountConfig/useMountConfig'
import { createDownload } from '@/common/utils/utils'
import { ConfigToggleSwitch } from '@/popup/pages/config/components/ConfigToggleSwitch'

export const MountConfigList = ({
  onEdit,
}: {
  onEdit: (config: MountConfig) => void
}) => {
  const { t } = useTranslation()
  const { configs } = useMountConfig()
  const { reorder, remove } = useEditMountConfig()
  const dialog = useDialog()
  const toast = useToast.use.toast()

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

  const getBadge = (config: MountConfig) => {
    const mode = config.mode ?? 'manual'
    if (mode === 'ai') {
      return (
        <Chip
          size="small"
          icon={<AutoAwesome />}
          label="AI Auto-fetch"
          color="secondary"
          variant="filled"
          sx={{ height: 24 }}
        />
      )
    }
    if (mode === 'custom') {
      if (!config.integration) {
        return (
          <Chip
            size="small"
            icon={<ErrorOutline />}
            label="Setup Incomplete"
            color="warning"
            variant="filled"
            sx={{ height: 24 }}
          />
        )
      }
      return (
        <Chip
          size="small"
          icon={<CheckCircle />}
          label="Custom Selectors"
          color="primary"
          variant="outlined"
          sx={{ height: 24 }}
        />
      )
    }
    return (
      <Chip
        size="small"
        label="Manual"
        variant="outlined"
        sx={{ height: 24 }}
      />
    )
  }

  return (
    <DraggableList
      items={configs}
      onEdit={onEdit}
      onReorder={(sourceIndex, destinationIndex) => {
        reorder.mutate({ sourceIndex, destinationIndex })
      }}
      renderPrimary={(config) => config.name}
      renderSecondary={(config) => (
        <Stack spacing={0.5} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary">
            {config.patterns[0]}
          </Typography>
          {getBadge(config)}
        </Stack>
      )}
      renderSecondaryAction={(config) => (
        <>
          <ConfigToggleSwitch config={config} />
          <DrilldownMenu
            BoxProps={{ display: 'inline' }}
            ButtonProps={{ edge: 'end' }}
          >
            <MenuItem onClick={() => handleDelete(config)}>
              <ListItemIcon>
                <Delete />
              </ListItemIcon>
              <ListItemText>{t('common.delete', 'Delete')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => exportConfig.mutate(config.id)}>
              <ListItemIcon>
                <ContentCopy />
              </ListItemIcon>
              <ListItemText>{t('common.export', 'Export')}</ListItemText>
            </MenuItem>
          </DrilldownMenu>
        </>
      )}
    />
  )
}
