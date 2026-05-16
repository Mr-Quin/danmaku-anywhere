import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import type { ReactElement } from 'react'
import { i18n } from '@/common/localization/i18n'
import { PopupTab } from '@/content/controller/store/popupStore'
import { CommentsPage } from '@/content/controller/ui/floatingPanel/pages/CommentsPage'
import { DebugPage } from '@/content/controller/ui/floatingPanel/pages/debug'
import { IntegrationPage } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/IntegrationPage'
import { MountPage } from '@/content/controller/ui/floatingPanel/pages/mount/MountPage'
import { SelectorPage } from '@/content/controller/ui/floatingPanel/pages/SelectorPage'
import { StylesPage } from '@/content/controller/ui/floatingPanel/pages/StylesPage'
import { SearchPage } from '@/content/controller/ui/floatingPanel/pages/search/SearchPage'
import { FilterPage } from '../floatingPanel/pages/FilterPage'
import { TitleMappingPage } from '../floatingPanel/pages/titleMapping/TitleMappingPage'

interface Route {
  tab: PopupTab
  name: () => string
  icon: ReactElement
  element: ReactElement
}

export const routes: Route[] = [
  {
    tab: PopupTab.Mount,
    name: () => i18n.t('tabs.mount', 'Library'),
    icon: <SubscriptionsOutlinedIcon />,
    element: <MountPage />,
  },
  {
    tab: PopupTab.Search,
    name: () => i18n.t('tabs.search', 'Search'),
    icon: <SearchOutlinedIcon />,
    element: <SearchPage />,
  },
  {
    tab: PopupTab.Selector,
    name: () => i18n.t('tabs.selector', 'Selector'),
    icon: <MyLocationOutlinedIcon />,
    element: <SelectorPage />,
  },
  {
    tab: PopupTab.Comments,
    name: () => i18n.t('tabs.danmaku', 'Danmaku'),
    icon: <CommentOutlinedIcon />,
    element: <CommentsPage />,
  },
  {
    tab: PopupTab.Styles,
    name: () => i18n.t('tabs.style', 'Style'),
    icon: <TuneOutlinedIcon />,
    element: <StylesPage />,
  },
  {
    tab: PopupTab.Filter,
    name: () => i18n.t('tabs.filter', 'Danmaku Filter'),
    icon: <FilterAltOutlinedIcon />,
    element: <FilterPage />,
  },
  {
    tab: PopupTab.Policy,
    name: () => i18n.t('tabs.integration', 'Integration'),
    icon: <IntegrationInstructionsOutlinedIcon />,
    element: <IntegrationPage />,
  },
  {
    tab: PopupTab.Debug,
    name: () => i18n.t('tabs.debug', 'Debug'),
    icon: <BugReportOutlinedIcon />,
    element: <DebugPage />,
  },
  {
    tab: PopupTab.TitleMapping,
    name: () => i18n.t('titleMapping.title', 'Title Mappings'),
    icon: <LocalOfferOutlinedIcon />,
    element: <TitleMappingPage />,
  },
]
