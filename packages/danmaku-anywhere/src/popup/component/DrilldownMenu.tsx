import { MoreVert } from '@mui/icons-material'
import type { BoxProps, IconButtonProps, MenuProps } from '@mui/material'
import { Box, IconButton, Menu } from '@mui/material'
import type { MouseEvent, PropsWithChildren } from 'react'
import { useId, useState } from 'react'

type DrilldownMenuProps = PropsWithChildren & {
  ButtonProps?: IconButtonProps
  BoxProps?: BoxProps
  MenuProps?: Partial<MenuProps>
}

export const DrilldownMenu = ({
  children,
  ButtonProps,
  BoxProps,
  MenuProps,
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
      </Menu>
    </Box>
  )
}
