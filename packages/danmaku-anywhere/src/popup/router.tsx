import { createHashRouter, Navigate } from 'react-router-dom'

import { ConfigPage } from './config/ConfigPage'
import { DanmakuPage } from './danmaku/DanmakuPage'
import { Home } from './Home'
import { Options } from './options/Options'
import { SearchPage } from './search/SearchPage'
import { StylesPage } from './styles/StylesPage'

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
