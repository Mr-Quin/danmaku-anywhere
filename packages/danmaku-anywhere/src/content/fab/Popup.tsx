import { Paper, Box, Slide, Tabs, Tab, AppBar } from '@mui/material'
import { PopupTab, usePopup } from '../store/popupStore'
import { SelectorPanel } from './SelectorPanel'
import { DanmakuInfo } from './InfoPanel'
import { SearchPanel } from './SearchPanel'
import { HiddenFab } from './Fab'
import { PopupPanelContainer } from './components/PopupPanelContainer'

export const AnimeSelectorPopup = () => {
  const { isOpen, tab, setTab } = usePopup()

  const handleTabChange = (_: any, value: PopupTab) => {
    setTab(value)
  }

  const handleClick = () => {
    usePopup.setState({ isOpen: !isOpen })
  }

  const renderTabs = () => {
    switch (tab) {
      case PopupTab.Info:
        return <DanmakuInfo />
      case PopupTab.Search:
        return <SearchPanel />
      case PopupTab.Selector:
        return <SelectorPanel />
    }
  }

  return (
    <Box
      position="absolute"
      zIndex={9999}
      bottom={(theme) => theme.spacing(12)}
      left={(theme) => theme.spacing(3)}
    >
      <Slide direction="right" in={isOpen} mountOnEnter unmountOnExit>
        <PopupPanelContainer>
          <AppBar position="static">
            <Tabs value={tab} onChange={handleTabChange} aria-label="Popup">
              <Tab label={PopupTab.Search} value={PopupTab.Search} />
              <Tab label={PopupTab.Selector} value={PopupTab.Selector} />
              <Tab label={PopupTab.Info} value={PopupTab.Info} />
            </Tabs>
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
