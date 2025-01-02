import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { Box, Collapse, IconButton, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface CollapsableSectionProps {
  children: ReactNode
  name: string
  initialOpen?: boolean
}

export const CollapsableSection = ({
  children,
  name,
  initialOpen,
}: CollapsableSectionProps) => {
  const [open, setOpen] = useState(initialOpen ?? false)

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" alignItems="center" mb={1}>
        <Typography variant="body1">{name}</Typography>
        <IconButton onClick={() => setOpen(!open)}>
          {open ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Stack>
      <Collapse in={open} unmountOnExit>
        {children}
      </Collapse>
    </Box>
  )
}
