import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { Box, Collapse, IconButton, Typography, useTheme } from '@mui/material'
import { type ReactNode, useState } from 'react'

type CollapsibleProps = {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

export const Collapsible = ({
  title,
  children,
  defaultOpen = false,
}: CollapsibleProps) => {
  const [open, setOpen] = useState(defaultOpen)
  const theme = useTheme()

  const handleToggle = () => {
    setOpen(!open)
  }

  return (
    <Box>
      <Box
        onClick={handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        {typeof title === 'string' ? (
          <Typography
            variant="body2"
            component="div"
            sx={{ flexGrow: 1, font: 'inherit' }}
          >
            {title}
          </Typography>
        ) : (
          title
        )}
        <IconButton size="small" sx={{ mr: 0.5 }}>
          {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>
      <Collapse in={open} unmountOnExit={false}>
        <Box
          sx={{
            pt: 1,
            pl: theme.spacing(1.5),
            borderLeft: `1px solid ${theme.palette.divider}`,
            ml: theme.spacing(1.5),
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  )
}
