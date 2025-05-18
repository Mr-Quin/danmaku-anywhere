import { ContentCopy, Delete } from '@mui/icons-material'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { NothingHere } from '@/common/components/NothingHere'
import { combinedPolicyService } from '@/common/options/combinedPolicy'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { useMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { createDownload } from '@/common/utils/utils'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { ConfigToggleSwitch } from '@/popup/pages/config/components/ConfigToggleSwitch'
import { useStore } from '@/popup/store'
import { useMutation } from '@tanstack/react-query'

export const MountConfigList = ({
  onEdit,
}: {
  onEdit: (config: MountConfig) => void
}) => {
  const { t } = useTranslation()
  const { configs } = useMountConfig()

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

  if (configs.length === 0) return <NothingHere />

  return (
    <List dense disablePadding>
      {configs.map((config) => {
        return (
          <ListItem
            key={config.id}
            secondaryAction={
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
                  <MenuItem
                    onClick={() => {
                      exportConfig.mutate(config.id)
                    }}
                  >
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
              <ListItemText
                primary={config.name}
                secondary={config.patterns[0]}
              />
            </ListItemButton>
          </ListItem>
        )
      })}
    </List>
  )
}
