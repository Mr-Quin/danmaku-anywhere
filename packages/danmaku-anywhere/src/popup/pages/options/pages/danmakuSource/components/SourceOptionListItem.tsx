import { Warning } from '@mui/icons-material'
import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Tooltip,
} from '@mui/material'
import type { ReactNode } from 'react'

interface SourceOptionListItemProps {
  enabled: boolean
  disableToggle: boolean
  onClick: () => void
  onToggle: (checked: boolean) => void
  itemText: string
  isLoading?: boolean
  showWarning?: boolean
  warningTooltip?: ReactNode
}

export const SourceOptionListItem = ({
  itemText,
  onClick,
  onToggle,
  enabled,
  disableToggle,
  isLoading,
  showWarning,
  warningTooltip,
}: SourceOptionListItemProps) => {
  return (
    <ListItem
      secondaryAction={
        isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Switch
            checked={enabled}
            onChange={(e) => {
              onToggle(e.target.checked)
            }}
            disabled={disableToggle || isLoading}
          />
        )
      }
      disablePadding
    >
      <ListItemButton onClick={onClick}>
        <ListItemText primary={itemText} />
        {showWarning && (
          <ListItemIcon>
            <Tooltip
              PopperProps={{
                // prevent clicks being propagated to the parent
                onMouseDown(e) {
                  e.stopPropagation()
                },
                onClick(e) {
                  e.stopPropagation()
                },
              }}
              title={warningTooltip}
            >
              <Warning color="warning" />
            </Tooltip>
          </ListItemIcon>
        )}
      </ListItemButton>
    </ListItem>
  )
}
