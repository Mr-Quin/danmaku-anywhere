import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { Collapse, ListItemButton, Paper } from '@mui/material'
import type { ListItemButtonProps } from '@mui/material/ListItemButton/ListItemButton'
import { ReactNode, useState } from 'react'

interface CollapsableListItemProps extends ListItemButtonProps {
  listItemChildren: ReactNode
}

export const CollapsableListItems = ({
  listItemChildren,
  children,
  ...rest
}: CollapsableListItemProps) => {
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    setOpen(!open)
  }

  return (
    <>
      <Paper
        sx={{
          top: 48,
          position: 'sticky',
          zIndex: 1,
          // bgcolor: 'background.paper',
        }}
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
