import { Paper, Stack, Tab, Tabs } from '@mui/material'
import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { AppToolBar } from './AppToolBar'
import { useStore } from './store'

import { getActiveTab } from '@/common/utils'

export const Home = () => {
  const currentTab = useLocation().pathname

  useEffect(() => {
    useStore.setState({ isLoading: true })

    getActiveTab().then((tab) => {
      if (!tab.url) throw new Error('No active tab')
      useStore.setState({ tabUrl: tab.url, isLoading: false })
    })
  }, [])

  return (
    <Stack direction="column" spacing={0} height={1}>
      <AppToolBar />
      <Paper elevation={1}>
        <Tabs value={currentTab === '/' ? '/search' : currentTab}>
          <Tab label="Search" value="/search" to="/search" component={Link} />
          <Tab
            label="Danmaku"
            value="/danmaku"
            to="/danmaku"
            component={Link}
          />
          <Tab label="Style" value="/styles" to="/styles" component={Link} />
          <Tab label="Config" value="/config" to="/config" component={Link} />
        </Tabs>
      </Paper>
      <Outlet />
    </Stack>
  )
}
