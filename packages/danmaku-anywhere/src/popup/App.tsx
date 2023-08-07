import {
  Backdrop,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
} from '@mui/material'
import { AnimeSearch } from './search/AnimeSearch'
import { useDanmakuDb } from '@/common/hooks/danmaku/useDanmakuDb'
import { useSessionState } from '@/common/hooks/useSessionState'
import { popupLogger } from '@/common/logger'
import { DanmakuController } from '@/popup/control/DanmakuController'

const App = () => {
  const [tab, setTab] = useSessionState(0, 'main/tab')
  const { isLoading, data, allDanmaku } = useDanmakuDb()

  popupLogger.log('App', isLoading, data, allDanmaku, window.location.href)

  const handleChange = (_: any, newValue: number) => {
    setTab(newValue)
  }

  const renderTabs = () => {
    switch (tab) {
      case 0:
        return <AnimeSearch />
      case 1:
        return <DanmakuController />
      default:
        return <AnimeSearch />
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
        open={isLoading}
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
            </Tabs>
          </Paper>
          {renderTabs()}
        </Stack>
      </Paper>
    </Container>
  )
}

export default App
