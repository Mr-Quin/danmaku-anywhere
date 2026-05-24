import type { PaperProps } from '@mui/material'
import { Paper } from '@mui/material'
import type { ReactNode, Ref } from 'react'

import { DevWatermark } from '@/common/components/DevWatermark'
import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import {
  CONTROLLER_WINDOW_DEFAULT_WIDTH,
  CONTROLLER_WINDOW_MIN_HEIGHT,
} from '@/content/controller/ui/constants/size'

interface WindowPaneLayoutProps {
  children: ReactNode
  paperProps?: PaperProps
  width?: number
  height?: number
  ref?: Ref<HTMLDivElement>
}

export const WindowPaneLayout = (props: WindowPaneLayoutProps) => {
  const {
    ref,
    width = CONTROLLER_WINDOW_DEFAULT_WIDTH,
    height = CONTROLLER_WINDOW_MIN_HEIGHT,
  } = props
  const sm = useIsSmallScreen()

  return (
    <Paper
      elevation={6}
      sx={{
        padding: 0,
        position: 'relative',
        width: sm ? '100%' : width,
        maxWidth: sm ? '100%' : width,
        minHeight: height,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'manipulation',
      }}
      ref={ref}
      {...props.paperProps}
    >
      {props.children}
      <DevWatermark />
    </Paper>
  )
}
