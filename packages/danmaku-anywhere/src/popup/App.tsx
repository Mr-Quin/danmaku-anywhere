import {
  Backdrop,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
} from '@mui/material'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { ConfigPage } from './config/ConfigPage'
import { SearchPage } from './search/SearchPage'
import { useStore } from './store'

import { db } from '@/common/db/db'
import { getActiveTab } from '@/common/utils'
import { ControlPage } from '@/popup/control/ControlPage'

const App = () => {
  const [tab, setTab] = useState(0)

  const isDbReady = useLiveQuery(() => db.isReady, [])
  const isLoadingTab = useStore((state) => state.isLoadingTabUrl)

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'danmaku/manager') {
        sendResponse('popup ready')
      }
    })
  }, [])

  useEffect(() => {
    useStore.setState({ isLoadingTabUrl: true })

    getActiveTab().then((tab) => {
      if (!tab.url) throw new Error('No active tab')
      useStore.setState({ tabUrl: tab.url, isLoadingTabUrl: false })
    })
  }, [])

  const handleChange = (_: any, newValue: number) => {
    setTab(newValue)
  }

  const renderTabs = () => {
    switch (tab) {
      case 0:
        return <SearchPage />
      case 1:
        return <ControlPage />
      case 2:
        return <ConfigPage />
      default:
        return <SearchPage />
    }
  }

  return (
    <Container
      sx={{
        padding: 0,
        width: 400,
        maxWidth: 400,
        height: 600,
        maxHeight: 600,
        overflow: 'hidden',
      }}
      fixed
    >
      <Backdrop
        open={!isDbReady || isLoadingTab}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <CircularProgress />
      </Backdrop>
      <Paper
        sx={{
          height: '100%',
          overflow: 'auto',
        }}
      >
        <Stack direction="column" spacing={0}>
          <Paper elevation={1}>
            <Tabs value={tab} onChange={handleChange}>
              <Tab label="Search"></Tab>
              <Tab label="Control"></Tab>
              <Tab label="Config"></Tab>
            </Tabs>
          </Paper>
          {renderTabs()}
        </Stack>
      </Paper>
    </Container>
  )
}

export default App
