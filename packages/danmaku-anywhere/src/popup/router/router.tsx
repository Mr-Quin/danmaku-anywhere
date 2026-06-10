import { createHashRouter, type RouteObject, redirect } from 'react-router'
import { ImportConfigPage } from '@/popup/pages/config/pages/import/ImportConfigPage'
import { AdvancedOptions } from '@/popup/pages/options/pages/advanced/AdvancedOptions'
import { AuthPage } from '@/popup/pages/options/pages/auth/AuthPage'
import { BackupPage } from '@/popup/pages/options/pages/backup/BackupPage'
import { About } from '@/popup/pages/options/pages/help/About'
import { PlayerOptions } from '@/popup/pages/options/pages/player/PlayerOptions'
import { SeasonDetailsPage } from '@/popup/pages/search/seasonDetails/SeasonDetailsPage'
import { TitleMappingPage } from '@/popup/pages/titleMapping/TitleMappingPage'
import { AiProvidersPage } from '../pages/ai/AiProvidersPage'
import { ConfigPage } from '../pages/config/pages/ConfigPage'
import { MountConfigEditor } from '../pages/config/pages/MountConfigEditor'
import { Home } from '../pages/home/Home'
import { ImportStandalonePage } from '../pages/import/ImportStandalonePage'
import { IntegrationPolicy } from '../pages/integrationPolicy/pages/IntegrationPolicy'
import { IntegrationPolicyEditor } from '../pages/integrationPolicy/pages/IntegrationPolicyEditor'
import { MountPage } from '../pages/mount/MountPage'
import { Options } from '../pages/options/Options'
import { HotkeyOptions } from '../pages/options/pages/hotkeyOptions/HotkeyOptions'
import { RetentionPolicyPage } from '../pages/options/pages/retentionPolicy/RetentionPolicyPage'
import { ManifestEditorPage } from '../pages/providers/pages/ManifestEditorPage'
import { ProvidersPage } from '../pages/providers/pages/ProvidersPage'
import { SearchPage } from '../pages/search/SearchPage'
import { StylesPage } from '../pages/styles/StylesPage'

export const POPUP_ROUTE_STORAGE_KEY = 'popup:lastRoute'
export const POPUP_DEFAULT_ROUTE = '/mount'

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Home,
    children: [
      {
        index: true,
        loader: () => redirect(POPUP_DEFAULT_ROUTE),
      },
      {
        path: 'mount',
        Component: MountPage,
      },
      {
        path: 'search',
        children: [
          { index: true, Component: SearchPage },
          { path: 'season', Component: SeasonDetailsPage },
        ],
      },
      {
        path: 'styles',
        Component: StylesPage,
      },
      {
        path: 'config',
        children: [
          { index: true, Component: ConfigPage },
          {
            path: 'add',
            element: <MountConfigEditor mode="add" />,
          },
          {
            path: 'edit',
            element: <MountConfigEditor mode="edit" />,
          },
          {
            path: 'import',
            Component: ImportConfigPage,
          },
          {
            path: 'integration-policy',
            Component: IntegrationPolicy,
            children: [
              {
                path: 'edit',
                element: <IntegrationPolicyEditor />,
              },
            ],
          },
        ],
      },
      {
        path: 'providers',
        Component: ProvidersPage,
        children: [
          {
            path: 'editor',
            Component: ManifestEditorPage,
          },
        ],
      },
      {
        path: 'ai-providers',
        Component: AiProvidersPage,
      },
      {
        path: 'title-mapping',
        Component: TitleMappingPage,
      },
    ],
  },
  {
    path: '/import',
    Component: ImportStandalonePage,
  },
  {
    path: '/options',
    Component: Options,
    children: [
      {
        path: 'auth',
        Component: AuthPage,
      },
      {
        path: 'hotkeys',
        Component: HotkeyOptions,
      },
      {
        path: 'data-management',
        Component: RetentionPolicyPage,
      },
      {
        path: 'player',
        Component: PlayerOptions,
      },
      {
        path: 'advanced',
        Component: AdvancedOptions,
      },
      {
        path: 'help',
        Component: About,
      },
      {
        path: 'backup',
        Component: BackupPage,
      },
    ],
  },
]

export const router: ReturnType<typeof createHashRouter> =
  createHashRouter(routes)
