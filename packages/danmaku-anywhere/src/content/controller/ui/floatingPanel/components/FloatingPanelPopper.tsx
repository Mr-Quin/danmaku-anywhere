import type { PopperProps } from '@mui/material'
import { SwipeableDrawer, useMediaQuery, Fade, Popper } from '@mui/material'
import type { ReactElement } from 'react'

import { usePopup } from '@/content/controller/store/popupStore'

interface FloatingPanelPopperProps {
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
  anchorEl,
  children,
}: FloatingPanelPopperProps) => {
  const { toggleOpen, isOpen } = usePopup()

  const sm = useMediaQuery('(max-width:600px)')

  if (sm) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={isOpen}
        disableSwipeToOpen
        hideBackdrop
        sx={{ zIndex: 1402 }}
        onOpen={() => toggleOpen(true)}
        onClose={() => toggleOpen(false)}
      >
        {children}
      </SwipeableDrawer>
    )
  }

  return (
    <Popper
      open={isOpen}
      anchorEl={anchorEl}
      transition
      modifiers={popperModifiers}
      sx={{ zIndex: 1402 }} // 1 above the floating button
    >
      {({ TransitionProps }) => {
        return <Fade {...TransitionProps}>{children}</Fade>
      }}
    </Popper>
  )
}
