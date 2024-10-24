import { createHashRouter, Navigate } from 'react-router-dom'

import { ConfigPage } from '../pages/config/pages/ConfigPage'
import { MountConfigEditor } from '../pages/config/pages/MountConfigEditor'
import { AnimePage } from '../pages/danmaku/pages/AnimePage'
import { DanmakuPage } from '../pages/danmaku/pages/DanmakuPage'
import { EpisodePage } from '../pages/danmaku/pages/EpisodePage'
import { ImportPage } from '../pages/danmaku/pages/ImportPage/ImportPage'
import { Home } from '../pages/home/Home'
import { MountPage } from '../pages/mount/MountPage'
import { Options } from '../pages/options/Options'
import { DanmakuSource } from '../pages/options/pages/danmakuSource/DanmakuSource'
import { Permissions } from '../pages/options/pages/Permissions'
import { FilterPage } from '../pages/styles/FilterPage'
import { StylesPage } from '../pages/styles/StylesPage'

import { IntegrationPolicy } from '@/popup/pages/integrationPolicy/pages/IntegrationPolicy'
import { IntegrationPolicyEditor } from '@/popup/pages/integrationPolicy/pages/IntegrationPolicyEditor'
import { BilibiliOptions } from '@/popup/pages/options/pages/danmakuSource/pages/BilibiliOptions'
import { DanDanPlayOptions } from '@/popup/pages/options/pages/danmakuSource/pages/DanDanPlayOptions'
import { HotkeyOptions } from '@/popup/pages/options/pages/hotkeyOptions/HotkeyOptions'
import { ThemeOptions } from '@/popup/pages/options/pages/theme/ThemeOptions'
import { SearchPage } from '@/popup/pages/search/SearchPage'

export const router = createHashRouter([
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
        Component: SearchPage,
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
            Component: FilterPage,
          },
        ],
      },
      {
        path: 'config',
        Component: ConfigPage,
        children: [
          {
            path: 'add',
            element: <MountConfigEditor mode="add" />,
          },
          {
            path: 'edit',
            element: <MountConfigEditor mode="edit" />,
          },
        ],
      },
      {
        path: 'danmaku',
        children: [
          {
            index: true,
            Component: AnimePage,
          },
          {
            path: 'anime',
            children: [
              { index: true, Component: EpisodePage },
              {
                path: 'comment',
                Component: DanmakuPage,
              },
            ],
          },
          {
            path: 'upload',
            Component: ImportPage,
          },
        ],
      },
      {
        path: 'integration-policy',
        Component: IntegrationPolicy,
        children: [
          {
            path: 'add',
            element: <IntegrationPolicyEditor mode="add" />,
          },
          {
            path: 'edit',
            element: <IntegrationPolicyEditor mode="edit" />,
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
        path: 'permissions',
        Component: Permissions,
      },
      {
        path: 'danmaku-source',
        Component: DanmakuSource,
        children: [
          {
            path: 'dandanplay',
            Component: DanDanPlayOptions,
          },
          {
            path: 'bilibili',
            Component: BilibiliOptions,
          },
        ],
      },
      {
        path: 'theme',
        Component: ThemeOptions,
      },
      {
        path: 'hotkeys',
        Component: HotkeyOptions,
      },
    ],
  },
])
