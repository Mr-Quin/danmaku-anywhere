import { ContentCopy, Delete } from '@mui/icons-material'
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { combinedPolicyService } from '@/common/options/combinedPolicy'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import {
  useEditMountConfig,
  useMountConfig,
} from '@/common/options/mountConfig/useMountConfig'
import { createDownload } from '@/common/utils/utils'
import { ConfigToggleSwitch } from '@/popup/pages/config/components/ConfigToggleSwitch'
import { useStore } from '@/popup/store'

export const MountConfigList = ({
  onEdit,
}: {
  onEdit: (config: MountConfig) => void
}) => {
  const { t } = useTranslation()
  const { configs } = useMountConfig()
  const { reorder } = useEditMountConfig()

  const { setShowConfirmDeleteDialog, setEditingConfig } = useStore.use.config()

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
