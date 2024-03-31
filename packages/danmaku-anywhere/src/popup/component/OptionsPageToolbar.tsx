import { ChevronLeft } from '@mui/icons-material'
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import { useGoBack } from '../hooks/useGoBack'

interface OptionsToolbarProps {
  title: string
  leftElement?: ReactNode
  rightElement?: ReactNode
}

export const OptionsPageToolBar = ({
  title,
  leftElement,
  rightElement,
}: OptionsToolbarProps) => {
  const goBack = useGoBack()

  const defaultLeftElement = (
    <IconButton edge="start" onClick={goBack}>
      <ChevronLeft />
    </IconButton>
  )

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        {leftElement ?? defaultLeftElement}
        <Typography
          variant="h6"
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%)',
          }}
        >
          {title}
        </Typography>
        {rightElement}
      </Toolbar>
    </AppBar>
  )
}
