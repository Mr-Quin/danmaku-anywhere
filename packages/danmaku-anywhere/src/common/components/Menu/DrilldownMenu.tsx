import { MoreVert } from '@mui/icons-material'
import {
  Box,
  type BoxProps,
  IconButton,
  type IconButtonProps,
  type MenuProps,
} from '@mui/material'
import {
  type MouseEvent,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from 'react'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownMenuList } from './DrilldownMenuList'

type DrilldownMenuProps = PropsWithChildren & {
  icon?: ReactNode
  ButtonProps?: IconButtonProps
  BoxProps?: BoxProps
  MenuProps?: Partial<MenuProps>
  items?: DAMenuItemConfig[]
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
      <DrilldownMenuList
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        items={items}
        dense={dense}
        MenuProps={MenuProps}
        buttonId={buttonId}
      >
        {children}
      </DrilldownMenuList>
    </Box>
  )
}
