import { Icon, ListItemIcon, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'

interface MediaTypeIconProps {
  icon: ReactNode
  description: string
}

export const MediaTypeIcon = ({ icon, description }: MediaTypeIconProps) => {
  return (
    <Tooltip title={description} disableFocusListener disableTouchListener>
      <ListItemIcon>
        <Icon
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {icon}
        </Icon>
      </ListItemIcon>
    </Tooltip>
  )
}
