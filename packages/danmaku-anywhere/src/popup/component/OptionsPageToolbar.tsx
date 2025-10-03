import { ChevronLeft } from '@mui/icons-material'
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import { useGoBack } from '../hooks/useGoBack'

interface OptionsToolbarProps {
  title: string
  leftElement?: ReactNode
  rightElement?: ReactNode
  sticky?: boolean
  onGoBack?: () => void
}

export const OptionsPageToolBar = ({
  title,
  leftElement,
  rightElement,
  sticky = false,
  onGoBack,
}: OptionsToolbarProps) => {
  // TODO: conditional use of hook
  const goBack = onGoBack ?? useGoBack()

  const defaultLeftElement = (
    <IconButton edge="start" onClick={goBack}>
      <ChevronLeft />
    </IconButton>
  )

  return (
    <AppBar
      elevation={0}
      position={sticky ? 'sticky' : 'static'}
      sx={{
        zIndex: 1,
      }}
    >
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
