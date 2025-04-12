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

import type { MountConfig } from '@/common/options/mountConfig/schema'
import { useMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { tryCatch } from '@/common/utils/utils'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { ConfigToggleSwitch } from '@/popup/pages/config/components/ConfigToggleSwitch'
import { useStore } from '@/popup/store'

export const MountConfigList = ({
  onEdit,
}: {
  onEdit: (config: MountConfig) => void
}) => {
  const { t } = useTranslation()
  const { configs } = useMountConfig()

  const { setShowConfirmDeleteDialog, setEditingConfig } = useStore.use.config()

  const copyToClipboard = async (config: MountConfig) => {
    await tryCatch(() =>
      navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    )
  }

  const handleDelete = (config: MountConfig) => {
    setShowConfirmDeleteDialog(true)
    setEditingConfig(config)
  }

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
                      void copyToClipboard(config)
                    }}
                  >
                    <ListItemIcon>
                      <ContentCopy />
                    </ListItemIcon>
                    <ListItemText>{t('common.copyToClipboard')}</ListItemText>
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
