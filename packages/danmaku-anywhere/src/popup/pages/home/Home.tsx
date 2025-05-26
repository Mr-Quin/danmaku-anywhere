import { Box, Container, Stack, Tab, Tabs } from '@mui/material'
import { Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useMatches } from 'react-router'

import { AppToolBar } from './AppToolBar'

import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabLayout } from '@/content/common/TabLayout'
import { ReleaseNotes } from '@/popup/component/releaseNotes/ReleaseNotes'
import { useEnvironment } from '@/popup/context/Environment'
import { ErrorBoundary } from 'react-error-boundary'

export const Home = () => {
  // the tab path should be the second element of the array
  const currentTab = useMatches()[1].pathname
  const location = useLocation()
  const { t } = useTranslation()
  const { isPopup } = useEnvironment()

  const tabs = useMemo(() => {
    return [
      {
        label: 'danmaku.mount',
        path: '/mount',
      },
      {
        label: 'tabs.search',
        path: '/search',
      },
      {
        label: 'tabs.danmaku',
        path: '/danmaku',
      },
      {
        label: 'tabs.style',
        path: '/styles',
      },
      {
        label: 'tabs.config',
        path: '/config',
      },
      {
        label: 'tabs.import',
        path: '/import',
      },
      {
        label: 'tabs.player',
        path: '/player',
      },
    ]
  }, [])

  const renderPopupTabs = () => {
    return (
      <>
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
          {tabs.map((tab) => {
            return (
              <Tab
                label={t(tab.label)}
                value={tab.path}
                to={tab.path}
                component={Link}
                key={tab.path}
              />
            )
          })}
        </Tabs>
      </>
    )
  }

  return (
    <Stack direction="column" spacing={0} height={1}>
      <AppToolBar />
      <Container
        sx={{
          minHeight: 0,
          height: '100%',
        }}
        disableGutters
      >
        <Box display="flex" flexGrow={1} height={1} maxWidth="xl">
          {isPopup && renderPopupTabs()}
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
      </Container>
    </Stack>
  )
}
