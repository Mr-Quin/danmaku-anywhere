import { Paper, Stack, Tab, Tabs } from '@mui/material'
import { Suspense } from 'react'
import { Link, Outlet, useMatches } from 'react-router-dom'

import { AppToolBar } from './AppToolBar'

import { PageSkeleton } from '@/popup/layout/PageSkeleton'

export const Home = () => {
  // the tab path should be the second element of the array
  const currentTab = useMatches()[1].pathname

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
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </Stack>
  )
}
