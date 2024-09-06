import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { Collapse, ListItemButton, Paper } from '@mui/material'
import type { ListItemButtonProps } from '@mui/material/ListItemButton/ListItemButton'
import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { startTransition, useState } from 'react'

interface CollapsableListItemProps extends ListItemButtonProps {
  listItemChildren: ReactNode
  paperProps?: ComponentProps<typeof Paper>
}

export const CollapsableListItems = ({
  listItemChildren,
  children,
  paperProps = {},
  onClick,
  ...rest
}: CollapsableListItemProps) => {
  const [open, setOpen] = useState(false)

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e)
    startTransition(() => setOpen(!open))
  }

  return (
    <>
      <Paper
        sx={{
          top: 32,
          position: 'sticky',
          zIndex: 1,
        }}
        {...paperProps}
      >
        <ListItemButton onClick={handleClick} disableRipple {...rest}>
          {listItemChildren}
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      </Paper>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </>
  )
}
