import { ContentCopy, Delete } from '@mui/icons-material'
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { tryCatch } from '@/common/utils'
import { useStore } from '@/popup/store'

export const MountConfigList = ({
  onEdit,
}: {
  onEdit: (config: MountConfig) => void
}) => {
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
                <Tooltip title="Delete">
                  <IconButton onClick={() => handleDelete(config)}>
                    <Delete />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy to clipboard">
                  <IconButton
                    edge="end"
                    aria-label="go to url"
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
