import { Divider, Toolbar, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'

interface PageToolbarProps extends PropsWithChildren {
  title?: string
  childrenPlacement?: 'start' | 'end'
  leftElement?: ReactNode
}

export const TabToolbar = ({
  title,
  children,
  leftElement,
}: PageToolbarProps) => {
  return (
    <>
      <Toolbar>
        {leftElement}
        {title && (
          <Typography variant="h2" fontSize={18} sx={{ flexGrow: 1 }} noWrap>
            {title}
          </Typography>
        )}
        {children}
      </Toolbar>
      <Divider />
    </>
  )
}
