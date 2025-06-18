import { PopupTab } from '@/content/controller/store/popupStore'
import { CommentsPage } from '@/content/controller/ui/floatingPanel/pages/CommentsPage'
import { DebugPage } from '@/content/controller/ui/floatingPanel/pages/DebugPage'
import { IntegrationPage } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/IntegrationPage'
import { MountPage } from '@/content/controller/ui/floatingPanel/pages/mount/MountPage'
import { SelectorPage } from '@/content/controller/ui/floatingPanel/pages/SelectorPage'
import { StylesPage } from '@/content/controller/ui/floatingPanel/pages/StylesPage'
import { SearchPage } from '@/content/controller/ui/floatingPanel/pages/search/SearchPage'

export const routes = [
  {
    tab: PopupTab.Mount,
    name: 'tabs.mount',
    element: <MountPage />,
  },
  {
    tab: PopupTab.Search,
    name: 'tabs.search',
    element: <SearchPage />,
  },
  {
    tab: PopupTab.Selector,
    name: 'tabs.selector',
    element: <SelectorPage />,
  },
  {
    tab: PopupTab.Comments,
    name: 'tabs.danmaku',
    element: <CommentsPage />,
  },
  {
    tab: PopupTab.Styles,
    name: 'tabs.style',
    element: <StylesPage />,
  },
  {
    tab: PopupTab.Policy,
    name: 'tabs.integrationPolicy',
    element: <IntegrationPage />,
  },
  {
    tab: PopupTab.Debug,
    name: 'debug',
    element: <DebugPage />,
  },
]
