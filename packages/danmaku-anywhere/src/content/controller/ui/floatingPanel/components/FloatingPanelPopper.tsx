import type { PopperProps } from '@mui/material'
import { Fade, Popper } from '@mui/material'
import type { ReactElement } from 'react'

interface FloatingPanelPopperProps {
  isOpen: boolean
  anchorEl: PopperProps['anchorEl']
  children: ReactElement<any, any>
}

const popperModifiers = [
  {
    name: 'offset',
    options: {
      offset: [0, 12],
    },
  },
  {
    name: 'flip',
    enabled: true,
    options: {
      altBoundary: false,
      rootBoundary: 'viewport',
      padding: 8,
    },
  },
  {
    name: 'preventOverflow',
    enabled: true,
    options: {
      altAxis: true,
      altBoundary: false,
      tether: false,
      rootBoundary: 'viewport',
      padding: 8,
    },
  },
]

export const FloatingPanelPopper = ({
  isOpen,
  anchorEl,
  children,
}: FloatingPanelPopperProps) => {
  return (
    <Popper
      open={isOpen}
      anchorEl={anchorEl}
      transition
      modifiers={popperModifiers}
    >
      {({ TransitionProps }) => {
        return <Fade {...TransitionProps}>{children}</Fade>
      }}
    </Popper>
  )
}
