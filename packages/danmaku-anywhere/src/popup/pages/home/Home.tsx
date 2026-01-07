import { Box, Stack, Tab, Tabs } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useMatches } from 'react-router'

import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { ReleaseNotes } from '@/popup/component/releaseNotes/ReleaseNotes'
import { AppToolBar } from './AppToolBar'

export const Home = () => {
  // the tab path should be the second element of the array
  const currentTab = useMatches()[1].pathname
  const location = useLocation()
  const { t } = useTranslation()

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
          <Tab
            label={t('tabs.mount', 'Library')}
            value="/mount"
            to="/mount"
            component={Link}
          />
          <Tab
            label={t('tabs.search', 'Search')}
            value="/search"
            to="/search"
            component={Link}
          />
          <Tab
            label={t('tabs.danmaku', 'Danmaku')}
            value="/danmaku"
            to="/danmaku"
            component={Link}
          />
          <Tab
            label={t('tabs.style', 'Danmaku Settings')}
            value="/styles"
            to="/styles"
            component={Link}
          />
          <Tab
            label={t('tabs.filter', 'Danmaku Filter')}
            value="/filter"
            to="/filter"
            component={Link}
          />
          <Tab
            label={t('tabs.config', 'Config')}
            value="/config"
            to="/config"
            component={Link}
          />
          <Tab
            label={t('tabs.providers', 'Providers')}
            value="/providers"
            to="/providers"
            component={Link}
          />
          <Tab
            label={t('tabs.aiProviders', 'AI Providers')}
            value="/ai-providers"
            to="/ai-providers"
            component={Link}
          />
        </Tabs>
        <ErrorBoundary
          fallbackRender={({ error }) => {
            return (
              <TabLayout>
                <ErrorMessage message={error.message} />
              </TabLayout>
            )
          }}
          key={location.key}
        >
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
        </ErrorBoundary>
        <ReleaseNotes />
      </Box>
    </Stack>
  )
}
