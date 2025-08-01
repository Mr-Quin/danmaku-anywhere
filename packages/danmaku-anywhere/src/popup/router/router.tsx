import { createHashRouter, Navigate } from 'react-router'

import { FilterPageWithRouter } from '@/content/common/DanmakuStyles/FilterPage'
import { ImportConfigPage } from '@/popup/pages/config/pages/import/ImportConfigPage'
import { ImportPage } from '@/popup/pages/import/ImportPage'
import { AdvancedOptions } from '@/popup/pages/options/pages/advanced/AdvancedOptions'
import { HelpOptions } from '@/popup/pages/options/pages/help/HelpOptions'
import { SeasonDetailsPage } from '@/popup/pages/search/seasonDetails/SeasonDetailsPage'
import { ConfigPage } from '../pages/config/pages/ConfigPage'
import { MountConfigEditor } from '../pages/config/pages/MountConfigEditor'
import { CommentPage } from '../pages/danmaku/pages/comments/CommentPage'
import { EpisodePage } from '../pages/danmaku/pages/episode/EpisodePage'
import { SeasonPage } from '../pages/danmaku/pages/season/SeasonPage'
import { Home } from '../pages/home/Home'
import { IntegrationPolicy } from '../pages/integrationPolicy/pages/IntegrationPolicy'
import { IntegrationPolicyEditor } from '../pages/integrationPolicy/pages/IntegrationPolicyEditor'
import { MountPage } from '../pages/mount/MountPage'
import { Options } from '../pages/options/Options'
import { DanmakuSource } from '../pages/options/pages/danmakuSource/DanmakuSource'
import { HotkeyOptions } from '../pages/options/pages/hotkeyOptions/HotkeyOptions'
import { RetentionPolicyPage } from '../pages/options/pages/retentionPolicy/RetentionPolicyPage'

import { SearchPage } from '../pages/search/SearchPage'
import { StylesPage } from '../pages/styles/StylesPage'

export const router: ReturnType<typeof createHashRouter> = createHashRouter([
  {
    path: '/',
    Component: Home,
    children: [
      {
        index: true,
        element: <Navigate to="mount" />,
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
        children: [
          {
            index: true,
            Component: StylesPage,
          },
          {
            path: 'filtering',
            Component: FilterPageWithRouter,
          },
        ],
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
        path: 'import',
        Component: ImportPage,
      },
      {
        path: 'danmaku',
        children: [
          {
            index: true,
            Component: SeasonPage,
          },
          {
            path: ':seasonId',
            children: [
              { index: true, Component: EpisodePage },
              {
                path: ':episodeId',
                Component: CommentPage,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/options',
    Component: Options,
    children: [
      {
        path: 'danmaku-source',
        Component: DanmakuSource,
      },

      {
        path: 'hotkeys',
        Component: HotkeyOptions,
      },
      {
        path: 'retention-policy',
        Component: RetentionPolicyPage,
      },
      {
        path: 'advanced',
        Component: AdvancedOptions,
      },
      {
        path: 'help',
        Component: HelpOptions,
      },
    ],
  },
])
