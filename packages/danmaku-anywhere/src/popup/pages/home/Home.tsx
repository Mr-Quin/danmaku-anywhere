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
import { Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useMatches } from 'react-router'

import { AppToolBar } from './AppToolBar'

import { ErrorMessage } from '@/common/components/ErrorMessage'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabLayout } from '@/content/common/TabLayout'
import { useEnvironment } from '@/content/common/context/Environment'
import { ReleaseNotes } from '@/popup/component/releaseNotes/ReleaseNotes'
import { useStore } from '@/popup/store'
import { ErrorBoundary } from 'react-error-boundary'

const DRAWER_WIDTH = 240

interface NavItem {
  label: string
  path: string
  children?: NavItem[]
}

const commonPages: NavItem[] = [
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
] as const

const dashboardPages: NavItem[] = [
  {
    label: 'tabs.video',
    path: '/video',
    children: [
      {
        label: 'tabs.kazumi',
        path: '/video/kazumi',
      },
      {
        label: 'tabs.videoSearch',
        path: '/video/search',
      },
      {
        label: 'tabs.localVideo',
        path: '/video/player',
      },
    ],
  },
] as const

export const Home = () => {
  const currentTab = useMatches()[1].pathname
  const location = useLocation()
  const { t } = useTranslation()
  const { isPopup } = useEnvironment()
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { open: drawerOpen, setOpen: setDrawerOpen } = useStore.use.drawer()

  const pages = useMemo(() => {
    if (isPopup) {
      return commonPages
    }
    return [...commonPages, ...dashboardPages]
  }, [isPopup])

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
  }

  const renderPopupTabs = () => {
    const flatPages = pages.flatMap((item) => {
      return item.children || [item]
    })

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
          {flatPages.map((tab) => {
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
        case '/video':
          return <VideoLibraryIcon />
        case '/search':
          return <SearchIcon />
        case '/danmaku':
          return <VideoLibraryIcon />
        case '/options':
          return <SettingsIcon />
        default:
          return <HomeIcon />
      }
    }

    const isPathActive = (path: string) => {
      if (location.pathname === path) return true
      return path !== '/' && location.pathname.startsWith(path + '/')
    }

    const renderNavItems = (items: NavItem[], level = 0) => {
      return items.map((item) => {
        const isActive = isPathActive(item.path)
        const hasChildren = item.children && item.children.length > 0

        return (
          <Box key={item.path}>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  pl: 2 + level,
                }}
              >
                <ListItemIcon>{getIconForPath(item.path)}</ListItemIcon>
                <ListItemText primary={t(item.label)} />
              </ListItemButton>
            </ListItem>

            {hasChildren && item.children && (
              <List disablePadding>
                {renderNavItems(item.children, level + 1)}
              </List>
            )}
          </Box>
        )
      })
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
        <List>{renderNavItems(pages)}</List>
      </Drawer>
    )
  }

  return (
    <Stack direction="column" spacing={0} height={1} flexGrow={1} flexBasis={0}>
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
