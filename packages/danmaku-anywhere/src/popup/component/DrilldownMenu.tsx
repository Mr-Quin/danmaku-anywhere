import { MoreVert } from '@mui/icons-material'
import type { IconButtonProps } from '@mui/material'
import { Box, IconButton, Menu } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { useId, useState } from 'react'

type DrilldownMenuProps = PropsWithChildren & {
  ButtonProps?: IconButtonProps
}

export const DrilldownMenu = ({
  children,
  ButtonProps,
}: DrilldownMenuProps) => {
  const buttonId = useId()
  const menuId = useId()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <Box>
      <IconButton id={buttonId} onClick={handleClick} {...ButtonProps}>
        <MoreVert />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': buttonId,
        }}
      >
        {children}
      </Menu>
    </Box>
  )
}
