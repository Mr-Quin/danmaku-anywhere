import { ChevronLeft } from '@mui/icons-material'
import { IconButton, Toolbar, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'
import { TOOLBAR_MIN_HEIGHT } from '@/common/theme/sakura'

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
      disableGutters
      sx={{
        flexShrink: 0,
        minHeight: TOOLBAR_MIN_HEIGHT,
        paddingInline: 2,
        paddingBlock: 0.5,
        gap: 0.5,
      }}
    >
      {showBackButton && backButton}
      {leftElement}
      {renderTitle()}
      {children}
    </Toolbar>
  )
}
