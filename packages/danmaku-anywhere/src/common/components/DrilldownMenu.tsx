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
  styled,
  type Theme,
  Tooltip,
} from '@mui/material'
import type {
  MouseEvent,
  PropsWithChildren,
  ReactElement,
  ReactNode,
} from 'react'
import { useId, useState } from 'react'

const StyledMenu = styled(Menu)({
  zIndex: 1403,
})

interface StyledMenuItemProps {
  color?: string
}

function resolveColor(theme: Theme, colorPath: string | undefined) {
  if (!colorPath) {
    return
  }

  // biome-ignore lint/suspicious/noExplicitAny: cannot safely type this, instead we check the type later
  const palette = colorPath.split('.').reduce<any>((acc, part) => {
    if (acc) {
      return acc[part]
    }
    return undefined
  }, theme.palette)

  if (!palette) {
    return
  }

  if (typeof palette === 'string') {
    return palette
  }

  if (typeof palette === 'object') {
    if ('main' in palette) {
      return palette.main
    }
  }
}

const StyledMenuItem = styled(MenuItem, {
  shouldForwardProp: (prop) => prop !== 'color',
})<StyledMenuItemProps>(({ color, theme }) => ({
  ['.MuiListItemIcon-root']: {
    minWidth: '28px',
    color: resolveColor(theme, color),
  },
  ['.MuiListItemText-root']: {
    color: resolveColor(theme, color),
  },
}))

const MenuDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}))

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
      color?: string
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
  dense?: boolean
}

export const DrilldownMenu = ({
  children,
  ButtonProps,
  BoxProps,
  MenuProps,
  items,
  icon,
  dense = false,
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
        {icon ?? <MoreVert fontSize={ButtonProps?.size} />}
      </IconButton>
      <StyledMenu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'aria-labelledby': buttonId,
            dense: dense,
          },
        }}
        {...MenuProps}
      >
        {children}
        {items?.map((item) => {
          if (item.kind === 'separator') {
            return <MenuDivider key={item.id} />
          }
          return (
            <Tooltip title={item.tooltip} key={item.id}>
              <div>
                <StyledMenuItem
                  onClick={() => {
                    item.onClick()
                    handleClose()
                  }}
                  disabled={item.disabled || item.loading}
                  color={item.color}
                >
                  <ListItemIcon>
                    {item.loading ? <CircularProgress size={24} /> : item.icon}
                  </ListItemIcon>
                  <ListItemText>{item.label}</ListItemText>
                </StyledMenuItem>
              </div>
            </Tooltip>
          )
        })}
      </StyledMenu>
    </Box>
  )
}
