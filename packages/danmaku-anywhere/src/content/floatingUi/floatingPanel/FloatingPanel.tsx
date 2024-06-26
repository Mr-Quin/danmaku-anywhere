import type { PopperProps } from '@mui/material'
import { Box, Paper } from '@mui/material'
import { Suspense } from 'react'
import { match } from 'ts-pattern'

import { PopupTab, usePopup } from '../../store/popupStore'

import { FloatingPanelPopper } from './components/FloatingPanelPopper'
import { FloatingPanelToolbar } from './components/FloatingPanelToolbar'
import { PanelTabs } from './components/PanelTabs'
import { useCloseOnEsc } from './hooks/useCloseOnEsc'
import { FloatingPanelLayout } from './layout/FloatingPanelLayout'
import { MountPage } from './pages/mount/MountPage'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { CommentsPanel } from '@/content/floatingUi/floatingPanel/pages/CommentsPanel'
import { InfoPanel } from '@/content/floatingUi/floatingPanel/pages/InfoPanel'
import { SearchPanel } from '@/content/floatingUi/floatingPanel/pages/search/SearchPanel'
import { SelectorPanel } from '@/content/floatingUi/floatingPanel/pages/SelectorPanel'

export const FloatingPanel = ({
  anchorEl,
}: {
  anchorEl: PopperProps['anchorEl']
}) => {
  useCloseOnEsc()
  const { tab, isOpen } = usePopup()

  return (
    <FloatingPanelPopper isOpen={isOpen} anchorEl={anchorEl}>
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
              {match(tab)
                .with(PopupTab.Info, () => <InfoPanel />)
                .with(PopupTab.Search, () => <SearchPanel />)
                .with(PopupTab.Selector, () => <SelectorPanel />)
                .with(PopupTab.Comments, () => <CommentsPanel />)
                .with(PopupTab.Mount, () => <MountPage />)
                .exhaustive()}
            </Suspense>
          </Paper>
        </Box>
      </FloatingPanelLayout>
    </FloatingPanelPopper>
  )
}
