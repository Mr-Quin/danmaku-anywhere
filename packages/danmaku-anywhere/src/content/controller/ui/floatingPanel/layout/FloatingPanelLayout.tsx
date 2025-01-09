import type { PaperProps } from '@mui/material'
import { useMediaQuery, Paper } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { forwardRef } from 'react'

type FloatingPanelLayout = PropsWithChildren & PaperProps

export const FloatingPanelLayout = forwardRef<
  HTMLDivElement,
  PropsWithChildren
>(({ children, ...rest }: FloatingPanelLayout, ref) => {
  const sm = useMediaQuery('(max-width:600px)')

  return (
    <Paper
      sx={{
        padding: 0,
        width: sm ? '100%' : 450,
        maxWidth: sm ? '100%' : 450,
        height: 400,
        maxHeight: 400,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'manipulation',
      }}
      ref={ref}
      {...rest}
    >
      {children}
    </Paper>
  )
})

FloatingPanelLayout.displayName = 'FloatingPanelLayout'
