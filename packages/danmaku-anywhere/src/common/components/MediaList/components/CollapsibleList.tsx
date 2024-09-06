import { ExpandLess, ExpandMore } from '@mui/icons-material'
import type { ListProps } from '@mui/material'
import { Collapse, List, ListItemButton, Paper } from '@mui/material'
import type { MouseEvent, PropsWithChildren, ReactNode } from 'react'
import { startTransition, useState } from 'react'

type CollapsableListProps = {
  listProps?: ListProps
  listItemChildren: ReactNode
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
} & PropsWithChildren

export const CollapsibleList = ({
  listItemChildren,
  listProps = {},
  onClick,
  children,
}: CollapsableListProps) => {
  const [open, setOpen] = useState(false)

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e)
    startTransition(() => setOpen(!open))
  }

  return (
    <List {...listProps}>
      <Paper elevation={0} sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
        <ListItemButton onClick={handleClick} disableRipple>
          {listItemChildren}
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      </Paper>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </List>
  )
}
