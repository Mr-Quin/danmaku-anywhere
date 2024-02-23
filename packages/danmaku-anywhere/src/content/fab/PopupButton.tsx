import { Paper, Box, Slide, AppBar } from '@mui/material'
import { useEffect } from 'react'

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

  const renderTabs = () => {
    switch (tab) {
      case PopupTab.Info:
        return <InfoPanel />
      case PopupTab.Search:
        return <SearchPanel />
      case PopupTab.Selector:
        return <SelectorPanel />
      case PopupTab.Comments:
        return <CommentsPanel />
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
    <Box
      position="absolute"
      zIndex={9999}
      bottom={(theme) => theme.spacing(12)}
      left={(theme) => theme.spacing(3)}
    >
      <Slide direction="right" in={isOpen} mountOnEnter unmountOnExit>
        <PopupPanelContainer>
          <AppBar position="relative">
            <PanelTabs />
          </AppBar>
          <Paper sx={{ borderRadius: 0, overflow: 'auto', height: 1 }}>
            {renderTabs()}
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
  )
}
