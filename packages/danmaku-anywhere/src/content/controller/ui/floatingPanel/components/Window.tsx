import type { PopoverVirtualElement } from '@mui/material'
import { SwipeableDrawer } from '@mui/material'
import type { ReactNode, Ref } from 'react'
import { memo } from 'react'
import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import { useStore } from '@/content/controller/store/store'
import { WindowPaneLayout } from '@/content/controller/ui/floatingPanel/layout/WindowPaneLayout'
import { WindowPopper } from './WindowPopper'

interface ControlWindowProps {
  anchorEl: HTMLElement | PopoverVirtualElement | null
  children: ReactNode
  onOpen: () => void
  onClose: () => void
  open: boolean
  toolbar: ReactNode
  ref?: Ref<HTMLDivElement>
}

const BaseWindow = ({
  anchorEl,
  children,
  onOpen,
  onClose,
  open,
  toolbar,
  ref,
}: ControlWindowProps) => {
  const sm = useIsSmallScreen()

  const isPicking = useStore((state) => state.integrationForm.isPicking)
  const editModeActive = useStore((state) => state.editMode.active)
  const visible = open && !isPicking && !editModeActive

  if (sm) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={visible}
        onOpen={() => onOpen()}
        onClose={() => onClose()}
        disableSwipeToOpen
        hideBackdrop
        sx={{
          zIndex: 1402,
        }}
        ref={ref}
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
    <WindowPopper anchorEl={anchorEl} open={visible} unmountOnExit={false}>
      {({ bind }) => {
        return (
          <>
            <div
              {...bind()}
              style={{
                cursor: 'grab',
                touchAction: 'none',
              }}
              ref={ref}
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
