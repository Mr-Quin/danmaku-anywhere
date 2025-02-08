import { Box, Paper, type PopoverVirtualElement } from '@mui/material'
import { Suspense } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { usePopup } from '@/content/controller/store/popupStore'
import { ControllerToolbar } from '@/content/controller/ui/floatingPanel/components/ControllerToolbar'
import { PanelTabs } from '@/content/controller/ui/floatingPanel/components/PanelTabs'
import { Window } from '@/content/controller/ui/floatingPanel/components/Window'
import { routes } from '@/content/controller/ui/router/routes'

export const ControllerWindow = ({
  anchorEl,
}: {
  anchorEl: PopoverVirtualElement | HTMLElement | null
}) => {
  const { isOpen, toggleOpen, tab } = usePopup()

  useHotkeys('esc', () => {
    toggleOpen(false)
  })

  return (
    <Window
      anchorEl={anchorEl}
      open={isOpen}
      onOpen={() => toggleOpen(true)}
      onClose={() => toggleOpen(false)}
      toolbar={<ControllerToolbar />}
    >
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
    </Window>
  )
}
