import {
  Chip,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Tooltip,
} from '@mui/material'
import type { ReactNode } from 'react'

import { getKeySymbolMap } from '@/common/options/extensionOptions/hotkeys'
import { getOS, properCase } from '@/common/utils/utils'

export interface ContextMenuItemProps {
  action: () => void
  disabled?: () => boolean
  tooltip?: () => ReactNode
  icon: () => ReactNode
  label: () => ReactNode
  hotkey?: string
}

export const ContextMenuItem = ({
  action,
  disabled,
  tooltip,
  icon,
  label,
  hotkey,
}: ContextMenuItemProps) => {
  const isDisabled = disabled?.() ?? false

  const isMacOs = getOS() === 'MacOS'
  const symbolMap = getKeySymbolMap({ isMacOs })

  return (
    <Tooltip title={tooltip?.()} placement="top">
      <div>
        <MenuItem disabled={isDisabled} onClick={action}>
          <ListItemIcon>{icon()}</ListItemIcon>
          <ListItemText>
            {label()}
            {hotkey && (
              <Chip
                variant="outlined"
                sx={{ ml: 1 }}
                size="small"
                color={isDisabled ? 'default' : 'primary'}
                label={hotkey
                  .split('+')
                  .map((key) => {
                    if (key in symbolMap) return symbolMap[key]
                    return properCase(key)
                  })
                  .join('+')}
              />
            )}
          </ListItemText>
        </MenuItem>
      </div>
    </Tooltip>
  )
}
