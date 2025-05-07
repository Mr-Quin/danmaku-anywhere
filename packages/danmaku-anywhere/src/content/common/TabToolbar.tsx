import { ChevronLeft } from '@mui/icons-material'
import { Divider, IconButton, Toolbar, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'

type PageToolbarProps = {
  title?: ReactNode
  childrenPlacement?: 'start' | 'end'
  leftElement?: ReactNode
  showBackButton?: boolean
  onGoBack?: () => void
} & PropsWithChildren

export const TabToolbar = ({
  title,
  children,
  leftElement,
  showBackButton,
  onGoBack,
}: PageToolbarProps) => {
  const backButton = showBackButton && (
    <IconButton edge="start" onClick={onGoBack}>
      <ChevronLeft />
    </IconButton>
  )

  return (
    <>
      <Toolbar>
        {showBackButton && backButton}
        {leftElement}
        {title && (
          <Typography
            variant="h2"
            fontSize={18}
            sx={{ flexGrow: 1 }}
            noWrap
            title={typeof title === 'string' ? title : undefined}
          >
            {title}
          </Typography>
        )}
        {children}
      </Toolbar>
      <Divider />
    </>
  )
}
