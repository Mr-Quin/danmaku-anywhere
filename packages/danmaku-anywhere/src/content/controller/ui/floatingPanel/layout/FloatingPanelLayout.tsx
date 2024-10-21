import type { PaperProps } from '@mui/material'
import { Paper } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { forwardRef } from 'react'

type FloatingPanelLayout = PropsWithChildren & PaperProps

export const FloatingPanelLayout = forwardRef<
  HTMLDivElement,
  PropsWithChildren
>(({ children, ...rest }: FloatingPanelLayout, ref) => {
  return (
    <Paper
      sx={{
        padding: 0,
        width: 450,
        maxWidth: 450,
        height: 400,
        maxHeight: 400,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      ref={ref}
      {...rest}
    >
      {children}
    </Paper>
  )
})

FloatingPanelLayout.displayName = 'FloatingPanelLayout'
