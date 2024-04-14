import { Close } from '@mui/icons-material'
import type { PopperProps } from '@mui/material'
import { AppBar, Box, IconButton, Paper, Toolbar } from '@mui/material'
import { match } from 'ts-pattern'

import { PopupTab, usePopup } from '../../store/popupStore'

import { FloatingPanelPopper } from './components/FloatingPanelPopper'
import { PanelTabs } from './components/PanelTabs'
import { useCloseOnEsc } from './hooks/useCloseOnEsc'
import { FloatingPanelLayout } from './layout/FloatingPanelLayout'

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
  const { tab, isOpen, toggleOpen } = usePopup()

  return (
    <FloatingPanelPopper isOpen={isOpen} anchorEl={anchorEl}>
      <FloatingPanelLayout>
        <AppBar position="relative">
          <Toolbar variant="dense" sx={{ justifyContent: 'flex-end' }}>
            <IconButton edge="end" onClick={() => toggleOpen(false)}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box display="flex" flexGrow={1} minHeight={0}>
          <PanelTabs />
          <Paper sx={{ borderRadius: 0, overflow: 'auto', height: 1, flex: 1 }}>
            {match(tab)
              .with(PopupTab.Info, () => <InfoPanel />)
              .with(PopupTab.Search, () => <SearchPanel />)
              .with(PopupTab.Selector, () => <SelectorPanel />)
              .with(PopupTab.Comments, () => <CommentsPanel />)
              .exhaustive()}
          </Paper>
        </Box>
      </FloatingPanelLayout>
    </FloatingPanelPopper>
  )
}
