import { Backdrop, CircularProgress, Container, Paper } from '@mui/material'
import { AnimeSearch } from './search/AnimeSearch'
import { useLocalDanmaku } from '@/common/hooks/danmaku/useLocalDanmaku'
import { Theme } from '@/common/style/Theme'

const App = () => {
  const { isLoading } = useLocalDanmaku()

  return (
    <Theme>
      <Container sx={{ padding: 0, minWidth: 430, maxWidth: 430 }} fixed>
        <Backdrop
          open={isLoading}
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <CircularProgress />
        </Backdrop>
        <Paper>
          <AnimeSearch />
          {/*<DanmakuController />*/}
          {/*<DanmakuDashboard />*/}
        </Paper>
      </Container>
    </Theme>
  )
}

export default App
