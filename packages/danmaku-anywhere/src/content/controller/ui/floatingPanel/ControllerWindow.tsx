import { Box, Paper, type PopoverVirtualElement, styled } from '@mui/material'
import { Suspense, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useDialogStore } from '@/common/components/Dialog/dialogStore'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { usePopup } from '@/content/controller/store/popupStore'
import { CONTROLLER_WINDOW_CONTENT_HEIGHT } from '@/content/controller/ui/constants/size'
import { ControllerToolbar } from '@/content/controller/ui/floatingPanel/components/ControllerToolbar'
import { InfoBar } from '@/content/controller/ui/floatingPanel/components/InfoBar'
import { PanelTabs } from '@/content/controller/ui/floatingPanel/components/PanelTabs'
import { Window } from '@/content/controller/ui/floatingPanel/components/Window'
import { routes } from '@/content/controller/ui/router/routes'

const WindowPaper = styled(Paper)({
  borderRadius: 0,
  overflow: 'auto',
  height: '100%',
  flex: 1,
  display: 'flex',
})

export const ControllerWindow = ({
  anchorEl,
}: {
  anchorEl: PopoverVirtualElement | HTMLElement | null
}) => {
  const { isOpen, toggleOpen, tab } = usePopup()
  const setContainer = useDialogStore.use.setContainer()

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setContainer(node)
    },
    [setContainer]
  )

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
      <InfoBar />
      <Box
        display="flex"
        position="relative"
        height={CONTROLLER_WINDOW_CONTENT_HEIGHT}
        minHeight={CONTROLLER_WINDOW_CONTENT_HEIGHT}
      >
        <PanelTabs />
        <WindowPaper ref={containerRef}>
          <Suspense
            fallback={
              <Box flexGrow={1}>
                <FullPageSpinner />
              </Box>
            }
          >
            {routes.find((route) => route.tab === tab)?.element}
          </Suspense>
        </WindowPaper>
      </Box>
    </Window>
  )
}
