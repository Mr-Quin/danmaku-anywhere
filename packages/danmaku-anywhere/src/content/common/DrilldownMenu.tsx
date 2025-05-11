import { MoreVert } from '@mui/icons-material'
import {
  type BoxProps,
  CircularProgress,
  type IconButtonProps,
  ListItemIcon,
  ListItemText,
  MenuItem,
  type MenuProps,
  Tooltip,
} from '@mui/material'
import { Box, IconButton, Menu } from '@mui/material'
import type { MouseEvent, PropsWithChildren, ReactNode } from 'react'
import { useId, useState } from 'react'

type MenuItemProps = {
  icon: ReactNode
  label: string
  id: string
  onClick: () => void
  disabled?: boolean
  tooltip?: ReactNode
  loading?: boolean
}

type DrilldownMenuProps = PropsWithChildren & {
  ButtonProps?: IconButtonProps
  BoxProps?: BoxProps
  MenuProps?: Partial<MenuProps>
  items?: MenuItemProps[]
}

export const DrilldownMenu = ({
  children,
  ButtonProps,
  BoxProps,
  MenuProps,
  items,
}: DrilldownMenuProps) => {
  const buttonId = useId()
  const menuId = useId()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <Box {...BoxProps}>
      <IconButton id={buttonId} onClick={handleClick} {...ButtonProps}>
        <MoreVert />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'aria-labelledby': buttonId,
          },
        }}
        {...MenuProps}
      >
        {children}
        {items?.map((item) => {
          return (
            <Tooltip title={item.tooltip} key={item.id}>
              <div>
                <MenuItem onClick={item.onClick} disabled={item.disabled}>
                  <ListItemIcon>
                    {item.loading ? <CircularProgress size={24} /> : item.icon}
                  </ListItemIcon>
                  <ListItemText>{item.label}</ListItemText>
                </MenuItem>
              </div>
            </Tooltip>
          )
        })}
      </Menu>
    </Box>
  )
}
