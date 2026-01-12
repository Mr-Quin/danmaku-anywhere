import { i18n } from '@/common/localization/i18n'
import { PopupTab } from '@/content/controller/store/popupStore'
import { CommentsPage } from '@/content/controller/ui/floatingPanel/pages/CommentsPage'
import { DebugPage } from '@/content/controller/ui/floatingPanel/pages/DebugPage'
import { IntegrationPage } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/IntegrationPage'
import { MountPage } from '@/content/controller/ui/floatingPanel/pages/mount/MountPage'
import { SelectorPage } from '@/content/controller/ui/floatingPanel/pages/SelectorPage'
import { StylesPage } from '@/content/controller/ui/floatingPanel/pages/StylesPage'
import { SearchPage } from '@/content/controller/ui/floatingPanel/pages/search/SearchPage'
import { FilterPage } from '../floatingPanel/pages/FilterPage'
import { TitleMappingPage } from '../floatingPanel/pages/titleMapping/TitleMappingPage'

export const routes = [
  {
    tab: PopupTab.Mount,
    name: () => i18n.t('tabs.mount', 'Library'),
    element: <MountPage />,
  },
  {
    tab: PopupTab.Search,
    name: () => i18n.t('tabs.search', 'Search'),
    element: <SearchPage />,
  },
  {
    tab: PopupTab.Selector,
    name: () => i18n.t('tabs.selector', 'Selector'),
    element: <SelectorPage />,
  },
  {
    tab: PopupTab.Comments,
    name: () => i18n.t('tabs.danmaku', 'Danmaku'),
    element: <CommentsPage />,
  },
  {
    tab: PopupTab.Styles,
    name: () => i18n.t('tabs.style', 'Style'),
    element: <StylesPage />,
  },
  {
    tab: PopupTab.Filter,
    name: () => i18n.t('tabs.filter', 'Danmaku Filter'),
    element: <FilterPage />,
  },
  {
    tab: PopupTab.Policy,
    name: () => i18n.t('tabs.integration', 'Integration'),
    element: <IntegrationPage />,
  },
  {
    tab: PopupTab.Debug,
    name: () => i18n.t('tabs.debug', 'Debug'),
    element: <DebugPage />,
  },
  {
    tab: PopupTab.TitleMapping,
    name: () => i18n.t('titleMapping.title', 'Title Mappings'),
    element: <TitleMappingPage />,
  },
]
