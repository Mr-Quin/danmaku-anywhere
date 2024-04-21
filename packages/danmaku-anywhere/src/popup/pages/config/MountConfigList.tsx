import { ContentCopy, Delete } from '@mui/icons-material'
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { MountConfig } from '@/common/options/mountConfig/mountConfig'
import { useMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { tryCatch } from '@/common/utils/utils'
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
    tryCatch(() =>
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
            key={config.name}
            secondaryAction={
              <>
                <Tooltip title={t('common.delete')}>
                  <IconButton onClick={() => handleDelete(config)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.copyToClipboard')}>
                  <IconButton
                    edge="end"
                    aria-label={t('common.copyToClipboard')}
                    onClick={() => {
                      copyToClipboard(config)
                    }}
                  >
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
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
