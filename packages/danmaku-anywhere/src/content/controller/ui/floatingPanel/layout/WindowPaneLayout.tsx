import type { PaperProps } from '@mui/material'
import { Paper } from '@mui/material'
import type { ReactNode, Ref } from 'react'

import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'

interface WindowPaneLayoutProps {
  children: ReactNode
  paperProps?: PaperProps
  width?: number
  height?: number
  ref?: Ref<HTMLDivElement>
}

export const WindowPaneLayout = (props: WindowPaneLayoutProps) => {
  const { ref, width = 500, height = 550 } = props
  const sm = useIsSmallScreen()

  return (
    <Paper
      sx={{
        padding: 0,
        width: sm ? '100%' : width,
        maxWidth: sm ? '100%' : width,
        height: height,
        maxHeight: height,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'manipulation',
      }}
      ref={ref}
      {...props.paperProps}
    >
      {props.children}
    </Paper>
  )
}
