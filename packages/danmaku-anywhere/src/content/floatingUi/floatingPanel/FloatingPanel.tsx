import type { PopperProps } from '@mui/material'
import { Paper, AppBar } from '@mui/material'
import { match } from 'ts-pattern'

import { PopupTab, usePopup } from '../../store/popupStore'

import { FloatingPanelPopper } from './components/FloatingPanelPopper'
import { PanelTabs } from './components/PanelTabs'
import { FloatingPanelLayout } from './layout/FloatingPanelLayout'

import { CommentsPanel } from '@/content/floatingUi/floatingPanel/pages/CommentsPanel'
import { InfoPanel } from '@/content/floatingUi/floatingPanel/pages/InfoPanel'
import { SearchPanel } from '@/content/floatingUi/floatingPanel/pages/SearchPanel'
import { SelectorPanel } from '@/content/floatingUi/floatingPanel/pages/SelectorPanel'

export const FloatingPanel = ({
  anchorEl,
}: {
  anchorEl: PopperProps['anchorEl']
}) => {
  const { tab, isOpen } = usePopup()

  return (
    <FloatingPanelPopper isOpen={isOpen} anchorEl={anchorEl}>
      <FloatingPanelLayout>
        <AppBar position="relative">
          <PanelTabs />
        </AppBar>
        <Paper sx={{ borderRadius: 0, overflow: 'auto', height: 1 }}>
          {match(tab)
            .with(PopupTab.Info, () => <InfoPanel />)
            .with(PopupTab.Search, () => <SearchPanel />)
            .with(PopupTab.Selector, () => <SelectorPanel />)
            .with(PopupTab.Comments, () => <CommentsPanel />)
            .exhaustive()}
        </Paper>
      </FloatingPanelLayout>
    </FloatingPanelPopper>
  )
}
