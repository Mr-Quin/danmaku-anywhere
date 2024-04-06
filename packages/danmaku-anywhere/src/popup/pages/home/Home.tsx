import { Box, Stack, Tab, Tabs } from '@mui/material'
import { Suspense } from 'react'
import { Link, Outlet, useLocation, useMatches } from 'react-router-dom'

import { AppToolBar } from './AppToolBar'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { Toast } from '@/common/components/toast/Toast'
import { TabLayout } from '@/popup/layout/TabLayout'

export const Home = () => {
  // the tab path should be the second element of the array
  const currentTab = useMatches()[1].pathname
  const location = useLocation()

  return (
    <Stack direction="column" spacing={0} height={1}>
      <AppToolBar />
      <Box display="flex" flexGrow={1} height={1} minHeight={0}>
        <Tabs
          value={currentTab === '/' ? '/mount' : currentTab}
          orientation="vertical"
          variant="scrollable"
          sx={{
            borderRight: 1,
            borderColor: 'divider',
            width: 100,
            flexShrink: 0,
          }}
        >
          <Tab label="Mount" value="/mount" to="/mount" component={Link} />
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
        <Suspense
          fallback={
            <TabLayout>
              <FullPageSpinner />
            </TabLayout>
          }
          key={location.key}
        >
          <Outlet />
        </Suspense>
      </Box>
      <Toast
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      />
    </Stack>
  )
}
