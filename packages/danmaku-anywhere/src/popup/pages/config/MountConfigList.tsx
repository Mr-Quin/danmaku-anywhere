import { Link } from '@mui/icons-material'
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useId } from 'react'

import type { MountConfig } from '@/common/constants/mountConfig'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'

export const MountConfigList = ({
  onEdit,
}: {
  onEdit: (config: MountConfig) => void
}) => {
  const { configs } = useMountConfig()

  const subheaderId = useId()

  const gotoUrl = (url: string) => {
    chrome.tabs.create({ url })
  }

  return (
    <List aria-labelledby={subheaderId} dense disablePadding>
      {configs?.map((config) => {
        return (
          <ListItem
            key={config.name}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="go to url"
                onClick={() => {
                  gotoUrl(config.patterns[0])
                }}
              >
                <Tooltip title="Go to url">
                  <Link />
                </Tooltip>
              </IconButton>
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
