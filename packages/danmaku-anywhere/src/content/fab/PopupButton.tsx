import { Paper, Box, Slide, AppBar, ClickAwayListener } from '@mui/material'
import { useEffect } from 'react'
import { match } from 'ts-pattern'

import { PopupTab, usePopup } from '../store/popupStore'

import { HiddenFab } from './components/Fab'
import { PanelTabs } from './components/PanelTabs'
import { PopupPanelContainer } from './components/PopupPanelContainer'
import { CommentsPanel } from './panels/CommentsPanel'
import { InfoPanel } from './panels/InfoPanel'
import { SearchPanel } from './panels/SearchPanel'
import { SelectorPanel } from './panels/SelectorPanel'

export const PopupButton = () => {
  const { isOpen, tab, setTab } = usePopup()

  const handleClick = () => {
    usePopup.setState({ isOpen: !isOpen })
    // Switch to search tab when open
    if (!isOpen && tab === PopupTab.Selector) {
      setTab(PopupTab.Search)
    }
  }

  // Close popup when press ESC
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        usePopup.setState({ isOpen: false })
      }
    }
    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [isOpen])

  return (
    <ClickAwayListener onClickAway={() => usePopup.setState({ isOpen: false })}>
      <Box
        position="fixed"
        bottom={(theme) => theme.spacing(12)}
        left={(theme) => theme.spacing(3)}
      >
        <Slide direction="right" in={isOpen} mountOnEnter unmountOnExit>
          <PopupPanelContainer>
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
          </PopupPanelContainer>
        </Slide>
        <HiddenFab
          color="primary"
          size="small"
          onOpen={handleClick}
          isOpen={isOpen}
        />
      </Box>
    </ClickAwayListener>
  )
}
