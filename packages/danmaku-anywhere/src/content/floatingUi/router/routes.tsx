import { CommentsPage } from '@/content/floatingUi/floatingPanel/pages/CommentsPage'
import { DebugPage } from '@/content/floatingUi/floatingPanel/pages/DebugPage'
import { MountPage } from '@/content/floatingUi/floatingPanel/pages/mount/MountPage'
import { SearchPage } from '@/content/floatingUi/floatingPanel/pages/search/SearchPage'
import { SelectorPage } from '@/content/floatingUi/floatingPanel/pages/SelectorPage'
import { StylesPage } from '@/content/floatingUi/floatingPanel/pages/StylesPage'
import { PopupTab } from '@/content/store/popupStore'

export const routes = [
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
    tab: PopupTab.Mount,
    name: 'tabs.mount',
    element: <MountPage />,
  },
  {
    tab: PopupTab.Styles,
    name: 'tabs.style',
    element: <StylesPage />,
  },
  {
    tab: PopupTab.Debug,
    name: 'debug',
    element: <DebugPage />,
  },
]
