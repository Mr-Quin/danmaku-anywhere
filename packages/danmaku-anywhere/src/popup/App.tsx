import {
  Backdrop,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
} from '@mui/material'
import { useState } from 'react'
import { SearchPage } from './search/SearchPage'
import { useIndexedDBContext } from '@/common/indexedDb/IndexedDbContext'
import { popupLogger } from '@/common/logger'
import { ControlPage } from '@/popup/control/ControlPage'

const App = () => {
  const [tab, setTab] = useState(0)
  const { db } = useIndexedDBContext()

  popupLogger.log('App', window.location.href)

  const handleChange = (_: any, newValue: number) => {
    setTab(newValue)
  }

  const renderTabs = () => {
    switch (tab) {
      case 0:
        return <SearchPage />
      case 1:
        return <ControlPage />
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
      <Backdrop open={!db} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
            </Tabs>
          </Paper>
          {renderTabs()}
        </Stack>
      </Paper>
    </Container>
  )
}

export default App
