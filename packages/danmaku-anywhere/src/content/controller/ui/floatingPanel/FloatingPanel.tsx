import type { PopperProps } from '@mui/material'
import { Box, Paper } from '@mui/material'
import { memo, Suspense } from 'react'

import { FloatingPanelPopper } from './components/FloatingPanelPopper'
import { FloatingPanelToolbar } from './components/FloatingPanelToolbar'
import { PanelTabs } from './components/PanelTabs'
import { useCloseOnEsc } from './hooks/useCloseOnEsc'
import { FloatingPanelLayout } from './layout/FloatingPanelLayout'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { usePopup } from '@/content/controller/store/popupStore'
import { routes } from '@/content/controller/ui/router/routes'

const BaseFloatingPanel = ({
  anchorEl,
}: {
  anchorEl: PopperProps['anchorEl']
}) => {
  useCloseOnEsc()
  const { tab } = usePopup()

  return (
    <FloatingPanelPopper anchorEl={anchorEl}>
      <FloatingPanelLayout>
        <FloatingPanelToolbar />
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
      </FloatingPanelLayout>
    </FloatingPanelPopper>
  )
}

export const FloatingPanel = memo(BaseFloatingPanel)
FloatingPanel.displayName = 'FloatingPanel'
