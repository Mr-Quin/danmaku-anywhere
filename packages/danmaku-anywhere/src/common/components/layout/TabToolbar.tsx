import { ChevronLeft } from '@mui/icons-material'
import { IconButton, Toolbar, Typography } from '@mui/material'
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
    <IconButton
      onClick={onGoBack}
      size="small"
      sx={{ ml: -0.5, mr: 0.25, flexShrink: 0 }}
    >
      <ChevronLeft fontSize="small" />
    </IconButton>
  )

  const renderTitle = () => {
    if (!title) {
      return null
    }
    if (typeof title === 'string') {
      return (
        <Typography
          variant="h4"
          sx={{ flexGrow: 1, minWidth: 0 }}
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
    <Toolbar
      variant="dense"
      sx={{
        flexShrink: 0,
        minHeight: 48,
        paddingInline: 2,
        paddingBlock: 1,
        gap: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {showBackButton && backButton}
      {leftElement}
      {renderTitle()}
      {children}
    </Toolbar>
  )
}
