import {
  ChevronLeft as ChevronLeftIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  VideoLibrary as VideoLibraryIcon,
} from '@mui/icons-material'
import {
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useMatches } from 'react-router'

import { AppToolBar } from './AppToolBar'

import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabLayout } from '@/content/common/TabLayout'
import { ReleaseNotes } from '@/popup/component/releaseNotes/ReleaseNotes'
import { useEnvironment } from '@/popup/context/Environment'
import { tabs } from '@/popup/pages/home/tabs'
import { useStore } from '@/popup/store'
import { ErrorBoundary } from 'react-error-boundary'

const DRAWER_WIDTH = 240

export const Home = () => {
  const currentTab = useMatches()[1].pathname
  const location = useLocation()
  const { t } = useTranslation()
  const { isPopup } = useEnvironment()
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { open: drawerOpen, setOpen: setDrawerOpen } = useStore.use.drawer()

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
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
    const getIconForPath = (path: string) => {
      switch (path) {
        case '/mount':
          return <HomeIcon />
        case '/videoSearch':
          return <SearchIcon />
        case '/danmaku':
          return <VideoLibraryIcon />
        case '/options':
          return <SettingsIcon />
        default:
          return <HomeIcon />
      }
    }

    return (
      <Drawer
        variant={isSmallScreen ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          {isSmallScreen && (
            <IconButton onClick={handleDrawerToggle}>
              <ChevronLeftIcon />
            </IconButton>
          )}
        </Toolbar>
        <List>
          {tabs.map((tab) => (
            <ListItem key={tab.path} disablePadding>
              <ListItemButton
                component={Link}
                to={tab.path}
                selected={currentTab === tab.path}
              >
                <ListItemIcon>{getIconForPath(tab.path)}</ListItemIcon>
                <ListItemText primary={t(tab.label)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    )
  }

  return (
    <Stack direction="column" spacing={0} height={1}>
      <AppToolBar />
      <Stack direction="row" height={1} minHeight={0}>
        {!isPopup && renderDrawer()}
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
    </Stack>
  )
}
