import { createHashRouter, Navigate } from 'react-router-dom'

import { ConfigPage } from '../pages/config/ConfigPage'
import { MountConfigEditor } from '../pages/config/editor/MountConfigEditor'
import { AnimePage } from '../pages/danmaku/AnimePage'
import { DanmakuPage } from '../pages/danmaku/DanmakuPage'
import { EpisodePage } from '../pages/danmaku/EpisodePage'
import { Home } from '../pages/home/Home'
import { MountPage } from '../pages/mount/MountPage'
import { Options } from '../pages/options/Options'
import { Permissions } from '../pages/options/pages/Permissions'
import { SearchPage } from '../pages/search/SearchPage'
import { StylesPage } from '../pages/styles/StylesPage'

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
        Component: StylesPage,
      },
      {
        path: 'config',
        Component: ConfigPage,
        children: [
          {
            path: 'add',
            Component: MountConfigEditor,
          },
          {
            path: 'edit',
            Component: MountConfigEditor,
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
            path: ':animeId',
            children: [
              { index: true, Component: EpisodePage },
              {
                path: ':episodeId',
                Component: DanmakuPage,
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
        path: 'permissions',
        Component: Permissions,
      },
    ],
  },
])
