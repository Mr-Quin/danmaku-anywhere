import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { Collapse, List, ListItemButton, ListProps, Paper } from '@mui/material'
import type { MouseEvent, PropsWithChildren, ReactNode } from 'react'
import { useState } from 'react'

type CollapsableListProps = {
  listProps?: ListProps
  listItemChildren: ReactNode
  onClick?: () => void
} & PropsWithChildren

export const CollapsibleList = ({
  listItemChildren,
  listProps = {},
  onClick,
  children,
}: CollapsableListProps) => {
  const [open, setOpen] = useState(false)

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.()
    setOpen(!open)
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
