import { createHashRouter, Navigate } from 'react-router-dom'

import { AddConfigPage } from '../pages/config/AddConfig'
import { ConfigPage } from '../pages/config/ConfigPage'
import { DanmakuPage } from '../pages/danmaku/DanmakuPage'
import { Home } from '../pages/home/Home'
import { Options } from '../pages/options/Options'
import { SearchPage } from '../pages/search/SearchPage'
import { StylesPage } from '../pages/styles/StylesPage'

export const router = createHashRouter([
  {
    path: '/',
    Component: Home,
    children: [
      {
        index: true,
        element: <Navigate to="search" />,
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
            Component: AddConfigPage,
          },
        ],
      },
      {
        path: 'danmaku',
        Component: DanmakuPage,
      },
    ],
  },
  {
    path: '/options',
    Component: Options,
  },
])
