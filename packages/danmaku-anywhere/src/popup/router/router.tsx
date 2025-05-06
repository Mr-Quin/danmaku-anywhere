import { Navigate, createHashRouter } from 'react-router'

import { FilterPageWithRouter } from '@/content/common/DanmakuStyles/FilterPage'
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
import { BilibiliOptions } from '../pages/options/pages/danmakuSource/pages/BilibiliOptions'
import { DanDanPlayOptions } from '../pages/options/pages/danmakuSource/pages/DanDanPlayOptions'
import { HotkeyOptions } from '../pages/options/pages/hotkeyOptions/HotkeyOptions'
import { RetentionPolicyPage } from '../pages/options/pages/retentionPolicy/RetentionPolicyPage'
import { ThemeOptions } from '../pages/options/pages/theme/ThemeOptions'
import { SearchPage } from '../pages/search/SearchPage'
import { StylesPage } from '../pages/styles/StylesPage'

import { ImportPage } from '@/popup/pages/import/ImportPage'
import { AdvancedOptions } from '@/popup/pages/options/pages/advanced/AdvancedOptions'
import { SeasonDetailsPage } from '@/popup/pages/search/seasonDetails/SeasonDetailsPage'

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
    path: '/options',
    Component: Options,
    children: [
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
      {
        path: 'retention-policy',
        Component: RetentionPolicyPage,
      },
      {
        path: 'advanced',
        Component: AdvancedOptions,
      },
    ],
  },
])
