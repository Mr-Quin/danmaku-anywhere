import { ContentCopy, Delete } from '@mui/icons-material'
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material'
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
      title: t('common.confirmDeleteTitle'),
      content: t('common.confirmDeleteMessage', { name: config.name }),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        if (!config.id) return
        await remove.mutateAsync(config.id, {
          onSuccess: () => {
            toast.success(t('configs.alert.deleted'))
          },
          onError: (e) => {
            toast.error(t('configs.alert.deleteError', { message: e.message }))
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
      renderPrimary={(config) => config.name}
      renderSecondary={(config) => config.patterns[0]}
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
              <ListItemText>{t('common.delete')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => exportConfig.mutate(config.id)}>
              <ListItemIcon>
                <ContentCopy />
              </ListItemIcon>
              <ListItemText>{t('common.export')}</ListItemText>
            </MenuItem>
          </DrilldownMenu>
        </>
      )}
    />
  )
}
