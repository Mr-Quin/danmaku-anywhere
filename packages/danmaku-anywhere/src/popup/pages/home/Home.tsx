import { Box, Stack, Tab, Tabs } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useMatches } from 'react-router'

import { AppToolBar } from './AppToolBar'

import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabLayout } from '@/content/common/TabLayout'
import { ReleaseNotes } from '@/popup/component/releaseNotes/ReleaseNotes'
import { ErrorBoundary } from 'react-error-boundary'

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
            label={t('danmaku.mount')}
            value="/mount"
            to="/mount"
            component={Link}
          />
          <Tab
            label={t('tabs.search')}
            value="/search"
            to="/search"
            component={Link}
          />
          <Tab
            label={t('tabs.danmaku')}
            value="/danmaku"
            to="/danmaku"
            component={Link}
          />
          <Tab
            label={t('tabs.style')}
            value="/styles"
            to="/styles"
            component={Link}
          />
          <Tab
            label={t('tabs.integrationPolicy')}
            value="/integration-policy"
            to="/integration-policy"
            component={Link}
          />
          <Tab
            label={t('tabs.config')}
            value="/config"
            to="/config"
            component={Link}
          />
          <Tab
            label={t('tabs.import')}
            value="/import"
            to="/import"
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
