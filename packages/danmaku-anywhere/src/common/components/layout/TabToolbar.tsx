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

  const renderTitle = () => {
    if (!title) {
      return null
    }
    if (typeof title === 'string') {
      return (
        <Typography
          variant="h2"
          fontSize={18}
          sx={{ flexGrow: 1 }}
          noWrap
          title={title}
        >
          {title}
        </Typography>
      )
    }
    return title
  }

  return (
    <>
      <Toolbar variant="dense" sx={{ flexShrink: 0 }}>
        {showBackButton && backButton}
        {leftElement}
        {renderTitle()}
        {children}
      </Toolbar>
      <Divider />
    </>
  )
}
