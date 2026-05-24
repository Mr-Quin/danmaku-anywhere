import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import { Box, Stack, Tab } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useMatches } from 'react-router'

import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { SidebarTabs } from '@/common/components/SidebarTabs'
import { MountAvailabilityBanner } from '@/popup/component/MountAvailabilityBanner'
import { ReleaseNotes } from '@/popup/component/releaseNotes/ReleaseNotes'
import { AppToolBar } from './AppToolBar'

export const Home = () => {
  // the tab path should be the second element of the array
  const currentTab = useMatches()[1].pathname
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <Stack
      direction="column"
      spacing={0}
      sx={{
        height: 1,
      }}
    >
      <AppToolBar />
      <Suspense fallback={null}>
        <MountAvailabilityBanner />
      </Suspense>
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          height: 1,
          minHeight: 0,
        }}
      >
        <SidebarTabs value={currentTab === '/' ? '/mount' : currentTab}>
          <Tab
            icon={<SubscriptionsOutlinedIcon />}
            iconPosition="top"
            label={t('tabs.mount', 'Library')}
            value="/mount"
            to="/mount"
            component={Link}
          />
          <Tab
            icon={<SearchOutlinedIcon />}
            iconPosition="top"
            label={t('tabs.search', 'Search')}
            value="/search"
            to="/search"
            component={Link}
          />
          <Tab
            icon={<TuneOutlinedIcon />}
            iconPosition="top"
            label={t('tabs.style', 'Danmaku Settings')}
            value="/styles"
            to="/styles"
            component={Link}
          />
          <Tab
            icon={<LanguageOutlinedIcon />}
            iconPosition="top"
            label={t('tabs.config', 'Config')}
            value="/config"
            to="/config"
            component={Link}
          />
          <Tab
            icon={<BoltOutlinedIcon />}
            iconPosition="top"
            label={t('tabs.providers', 'Providers')}
            value="/providers"
            to="/providers"
            component={Link}
          />
          <Tab
            icon={<AutoAwesomeOutlinedIcon />}
            iconPosition="top"
            label={t('tabs.aiProviders', 'AI Providers')}
            value="/ai-providers"
            to="/ai-providers"
            component={Link}
          />
          <Tab
            icon={<LocalOfferOutlinedIcon />}
            iconPosition="top"
            label={t('tabs.titleMapping', 'Title Mapping')}
            value="/title-mapping"
            to="/title-mapping"
            component={Link}
          />
        </SidebarTabs>
        <ErrorBoundary
          fallbackRender={({ error }) => {
            return (
              <TabLayout>
                <ErrorMessage message={(error as Error).message} />
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
