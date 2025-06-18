import type { PopoverVirtualElement } from '@mui/material'
import { SwipeableDrawer } from '@mui/material'
import type { ReactNode } from 'react'
import { memo } from 'react'
import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import { WindowPaneLayout } from '@/content/controller/ui/floatingPanel/layout/WindowPaneLayout'
import { WindowPopper } from './WindowPopper'

interface ControlWindowProps {
  anchorEl: HTMLElement | PopoverVirtualElement | null
  children: ReactNode
  onOpen: () => void
  onClose: () => void
  open: boolean
  toolbar: ReactNode
}

const BaseWindow = ({
  anchorEl,
  children,
  onOpen,
  onClose,
  open,
  toolbar,
}: ControlWindowProps) => {
  const sm = useIsSmallScreen()

  if (sm) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={() => onOpen()}
        onClose={() => onClose()}
        disableSwipeToOpen
        hideBackdrop
        sx={{ zIndex: 1402 }}
      >
        <WindowPaneLayout>
          <>
            {toolbar}
            {children}
          </>
        </WindowPaneLayout>
      </SwipeableDrawer>
    )
  }

  return (
    <WindowPopper anchorEl={anchorEl} open={open} unmountOnExit={false}>
      {({ bind }) => {
        return (
          <>
            <div
              {...bind()}
              style={{
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              {toolbar}
            </div>
            {children}
          </>
        )
      }}
    </WindowPopper>
  )
}

export const Window = memo(BaseWindow)
Window.displayName = 'Window'
