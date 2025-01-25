import type { PopoverVirtualElement } from '@mui/material'
import { Box, Paper } from '@mui/material'
import { memo, Suspense } from 'react'

import { FloatingPanelToolbar } from './components/FloatingPanelToolbar'
import { PanelTabs } from './components/PanelTabs'
import { PopperWindow } from './components/PopperWindow'
import { useCloseOnEsc } from './hooks/useCloseOnEsc'
import { FloatingPanelLayout } from './layout/FloatingPanelLayout'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { usePopup } from '@/content/controller/store/popupStore'
import { routes } from '@/content/controller/ui/router/routes'

const BaseControlWindow = ({
  anchorEl,
}: {
  anchorEl: HTMLElement | PopoverVirtualElement | null
}) => {
  useCloseOnEsc()

  const { tab, isOpen } = usePopup()

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

  return (
    <PopperWindow anchorEl={anchorEl} open={isOpen}>
      {({ bind }) => {
        return (
          <FloatingPanelLayout>
            <div
              {...bind()}
              style={{
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <FloatingPanelToolbar />
            </div>
            {content}
          </FloatingPanelLayout>
        )
      }}
    </PopperWindow>
  )
}

export const ControlWindow = memo(BaseControlWindow)
ControlWindow.displayName = 'ControlWindow'
