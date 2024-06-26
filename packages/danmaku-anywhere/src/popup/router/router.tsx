import { createHashRouter, Navigate } from 'react-router-dom'

import { MountConfigEditor } from '../pages/config/components/MountConfigEditor'
import { ConfigPage } from '../pages/config/ConfigPage'
import { AnimePage } from '../pages/danmaku/AnimePage'
import { DanmakuPage } from '../pages/danmaku/DanmakuPage'
import { EpisodePage } from '../pages/danmaku/EpisodePage'
import { UploadPage } from '../pages/danmaku/UploadPage'
import { Home } from '../pages/home/Home'
import { MountPage } from '../pages/mount/MountPage'
import { Options } from '../pages/options/Options'
import { DanmakuSource } from '../pages/options/pages/DanmakuSource'
import { Permissions } from '../pages/options/pages/Permissions'
import { SearchPage } from '../pages/search/SearchPage'
import { FilterPage } from '../pages/styles/FilterPage'
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
            Component: UploadPage,
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
      },
    ],
  },
])
