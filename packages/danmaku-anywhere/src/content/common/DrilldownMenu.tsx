import { MoreVert } from '@mui/icons-material'
import {
  Box,
  type BoxProps,
  CircularProgress,
  Divider,
  IconButton,
  type IconButtonProps,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  type MenuProps,
  Tooltip,
} from '@mui/material'
import type {
  MouseEvent,
  PropsWithChildren,
  ReactElement,
  ReactNode,
} from 'react'
import { useId, useState } from 'react'

export type DrilldownMenuItemProps =
  | {
      kind?: 'item'
      icon: ReactNode
      label: string
      id: string
      onClick: () => void
      disabled?: boolean
      tooltip?: ReactNode
      loading?: boolean
    }
  | {
      kind: 'separator'
      id: string
    }

type DrilldownMenuProps = PropsWithChildren & {
  icon?: ReactNode
  ButtonProps?: IconButtonProps
  BoxProps?: BoxProps
  MenuProps?: Partial<MenuProps>
  items?: DrilldownMenuItemProps[]
}

export const DrilldownMenu = ({
  children,
  ButtonProps,
  BoxProps,
  MenuProps,
  items,
  icon,
}: DrilldownMenuProps): ReactElement => {
  const buttonId = useId()
  const menuId = useId()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <Box {...BoxProps}>
      <IconButton id={buttonId} onClick={handleClick} {...ButtonProps}>
        {icon ?? <MoreVert />}
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
          if (item.kind === 'separator') {
            return <Divider key={item.id} />
          }
          return (
            <Tooltip title={item.tooltip} key={item.id}>
              <div>
                <MenuItem
                  onClick={() => {
                    item.onClick()
                    handleClose()
                  }}
                  disabled={item.disabled || item.loading}
                >
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
