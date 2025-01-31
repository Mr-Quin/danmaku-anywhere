import type { PopoverVirtualElement } from '@mui/material'
import { SwipeableDrawer, Box, Paper } from '@mui/material'
import { memo, Suspense } from 'react'

import { ControlWindowToolbar } from './components/ControlWindowToolbar'
import { PanelTabs } from './components/PanelTabs'
import { useCloseOnEsc } from './hooks/useCloseOnEsc'
import { PopperWindow } from './layout/PopperWindow'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import { usePopup } from '@/content/controller/store/popupStore'
import { WindowPaneLayout } from '@/content/controller/ui/floatingPanel/layout/WindowPaneLayout'
import { routes } from '@/content/controller/ui/router/routes'

const BaseControlWindow = ({
  anchorEl,
}: {
  anchorEl: HTMLElement | PopoverVirtualElement | null
}) => {
  useCloseOnEsc()

  const sm = useIsSmallScreen()

  const { tab, isOpen, toggleOpen } = usePopup()

  const content = (
    <Box display="flex" flexGrow={1} minHeight={0}>
      <PanelTabs />
      <Paper
        sx={{
          borderRadius: 0,
          overflow: 'auto',
          height: 1,
          flex: 1,
          display: 'flex',
        }}
      >
        <Suspense
          fallback={
            <Box flexGrow={1}>
              <FullPageSpinner />
            </Box>
          }
        >
          {routes.find((route) => route.tab === tab)?.element}
        </Suspense>
      </Paper>
    </Box>
  )

  if (sm) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={isOpen}
        onOpen={() => toggleOpen(true)}
        onClose={() => toggleOpen(false)}
        disableSwipeToOpen
        hideBackdrop
        sx={{ zIndex: 1402 }}
      >
        <WindowPaneLayout>
          <>
            <ControlWindowToolbar />
            {content}
          </>
        </WindowPaneLayout>
      </SwipeableDrawer>
    )
  }

  return (
    <PopperWindow anchorEl={anchorEl} open={isOpen}>
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
              <ControlWindowToolbar />
            </div>
            {content}
          </>
        )
      }}
    </PopperWindow>
  )
}

export const ControlWindow = memo(BaseControlWindow)
ControlWindow.displayName = 'ControlWindow'
