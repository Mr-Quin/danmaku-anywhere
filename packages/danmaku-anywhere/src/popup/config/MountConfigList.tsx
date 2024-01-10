import { AddCircle, Link } from '@mui/icons-material'
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  Tooltip,
} from '@mui/material'
import { useId } from 'react'
import { useMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { MountConfig } from '@/common/constants/mountConfig'

export const MountConfigList = ({
  onEdit,
  onAdd,
}: {
  onEdit: (config: MountConfig) => void
  onAdd: () => void
}) => {
  const { configs } = useMountConfig()

  const subheaderId = useId()

  const gotoUrl = (url: string) => {
    chrome.tabs.create({ url })
  }

  return (
    <List
      aria-labelledby={subheaderId}
      subheader={
        <ListSubheader component="div" id={subheaderId}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Configs
            <IconButton
              edge="end"
              aria-label="add"
              onClick={() => onAdd()}
              color="primary"
            >
              <Tooltip title="Add">
                <AddCircle />
              </Tooltip>
            </IconButton>
          </Stack>
        </ListSubheader>
      }
      dense
      disablePadding
    >
      {configs?.map((config) => {
        return (
          <ListItem
            key={config.id}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="go to url"
                onClick={() => gotoUrl(config.patterns[0])}
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
