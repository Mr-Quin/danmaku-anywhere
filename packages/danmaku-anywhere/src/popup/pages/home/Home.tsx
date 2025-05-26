import { ChevronLeft } from '@mui/icons-material'
import {
  Box,
  Container,
  Drawer,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  styled,
} from '@mui/material'
import { Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useMatches } from 'react-router'

import { AppToolBar } from './AppToolBar'

import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabLayout } from '@/content/common/TabLayout'
import { ReleaseNotes } from '@/popup/component/releaseNotes/ReleaseNotes'
import { useEnvironment } from '@/popup/context/Environment'
import { ErrorBoundary } from 'react-error-boundary'

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}))

export const Home = () => {
  // the tab path should be the second element of the array
  const currentTab = useMatches()[1].pathname
  const location = useLocation()
  const { t } = useTranslation()
  const { isPopup } = useEnvironment()

  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const handleDrawerOpen = (open: boolean) => {
    setDrawerOpen(open)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }

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

  const renderDrawer = () => {
    return (
      <Drawer open={drawerOpen} variant="persistent">
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeft />
          </IconButton>
        </DrawerHeader>
        {tabs.map((tab) => {
          return (
            <ListItem key={tab.label} disablePadding>
              <ListItemButton
                component={Link}
                to={tab.path}
                data-active={currentTab === tab.path}
                sx={{
                  '&[data-active]': {
                    backgroundColor: 'action.selected',
                    '&:hover': {
                      backgroundColor: 'action.selectedHover',
                    },
                  },
                }}
              >
                <ListItemText primary={t(tab.label)} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </Drawer>
    )
  }

  return (
    <Stack direction="column" spacing={0} height={1}>
      <AppToolBar drawerOpen={drawerOpen} setDrawerOpen={handleDrawerOpen} />
      <Container
        sx={{
          minHeight: 0,
          height: '100%',
        }}
        disableGutters
      >
        <Box display="flex" flexGrow={1} height={1} maxWidth="xl">
          {isPopup && renderPopupTabs()}
          {!isPopup && renderDrawer()}
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
