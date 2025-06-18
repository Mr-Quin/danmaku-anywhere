import { NothingHere } from '@danmaku-anywhere/danmaku-anywhere-extension'
import { AppBar, Container, Paper, Toolbar, Typography } from '@mui/material'

export const App = () => {
  return (
    <Paper className="min-h-lvh">
      <AppBar position="static">
        <Toolbar></Toolbar>
      </AppBar>
      <Container maxWidth="xl">
        <Typography variant="h1" className="w-0">
          Hello World
        </Typography>
        <NothingHere />
      </Container>
    </Paper>
  )
}
