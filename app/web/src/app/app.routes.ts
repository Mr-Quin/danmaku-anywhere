import type { Routes } from '@angular/router'
import { hasExtension } from './core/extension/extension.guard'
import { developmentOnly } from './features/kazumi/guards/development.guard'
import { validateKazumiPolicy } from './features/kazumi/guards/kazumi-policy-validation.guard'
import {
  noOnboarding,
  requireOnboarding,
} from './features/onboarding/guards/onboarding.guard'
import { PAGE_TITLE } from './shared/constants'
import type { RouteData } from './shared/types'

export const routes: Routes = [
  {
    path: '',
    canActivateChild: [requireOnboarding],
    children: [
      { path: '', redirectTo: 'trending', pathMatch: 'full' },
      {
        path: 'trending',
        loadComponent: () =>
          import('./features/bangumi/pages/trending/trending-page').then(
            (m) => m.TrendingPage
          ),
        title: `热门动画 | ${PAGE_TITLE}`,
        data: { requireExtension: true } satisfies RouteData,
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/bangumi/pages/calendar/calendar-page').then(
            (m) => m.CalendarPage
          ),
        title: `放送日历 | ${PAGE_TITLE}`,
        data: { requireExtension: true } satisfies RouteData,
      },
      {
        path: 'details/:id',
        loadComponent: () =>
          import('./features/bangumi/pages/details/details-page').then(
            (m) => m.DetailsPage
          ),
        title: `详情 | ${PAGE_TITLE}`,
        data: { requireExtension: true } satisfies RouteData,
      },
      {
        path: 'local',
        loadComponent: () =>
          import('./features/local/local-player-page.component').then(
            (m) => m.LocalPlayerPageComponent
          ),
        title: `本地视频 | ${PAGE_TITLE}`,
      },
      {
        path: 'kazumi',
        loadComponent: () =>
          import('./features/kazumi/layout/kazumi-layout').then(
            (m) => m.KazumiLayout
          ),
        data: { requireExtension: true } satisfies RouteData,
        children: [
          {
            path: '',
            redirectTo: 'search',
            pathMatch: 'full',
          },
          {
            path: 'search',
            loadComponent: () =>
              import('./features/kazumi/pages/kazumi-search-page').then(
                (m) => m.KazumiSearchPage
              ),
          },
          {
            path: 'detail',
            loadComponent: () =>
              import('./features/kazumi/pages/kazumi-detail-page').then(
                (m) => m.KazumiDetailPage
              ),
            canActivate: [validateKazumiPolicy],
          },
        ],
      },
      {
        path: 'debug',
        loadComponent: () =>
          import('./features/kazumi/layout/kazumi-layout').then(
            (m) => m.KazumiLayout
          ),
        data: { requireExtension: true } satisfies RouteData,
        children: [
          {
            path: 'video',
            loadComponent: () =>
              import('./features/debug/video-debug-page.component').then(
                (m) => m.VideoDebugPageComponent
              ),
            canActivate: [developmentOnly],
            title: `Debug Video | ${PAGE_TITLE}`,
          },
          {
            path: 'components',
            loadComponent: () =>
              import('./features/debug/component-debug.component').then(
                (m) => m.ComponentDebugComponent
              ),
            canActivate: [developmentOnly],
            title: `Debug Components | ${PAGE_TITLE}`,
          },
        ],
      },
    ],
  },
  {
    path: 'onboarding',
    title: PAGE_TITLE,
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-page').then(
        (m) => m.OnboardingPage
      ),
    canActivate: [hasExtension, noOnboarding],
    data: { hideNavigation: true } satisfies RouteData,
  },
  {
    path: '**',
    redirectTo: '',
  },
]
