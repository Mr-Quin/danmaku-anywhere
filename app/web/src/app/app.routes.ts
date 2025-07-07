import type { Routes } from '@angular/router'
import { hasExtension, noExtension } from './core/extension/extension.guard'
import { noSearchDetails } from './features/kazumi/guards/kazumi-policy.guard'
import {
  noOnboarding,
  requireOnboarding,
} from './features/onboarding/guards/onboarding.guard'
import { PAGE_TITLE } from './shared/constants'
import type { RouteData } from './shared/types'

export const routes: Routes = [
  {
    path: '',
    canActivateChild: [requireOnboarding, hasExtension],
    children: [
      { path: '', redirectTo: 'trending', pathMatch: 'full' },
      {
        path: 'trending',
        loadComponent: () =>
          import('./features/bangumi/pages/trending/trending-page').then(
            (m) => m.TrendingPage
          ),
        title: `热门动画 | ${PAGE_TITLE}`,
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/bangumi/pages/calendar/calendar-page').then(
            (m) => m.CalendarPage
          ),
        title: `放送日历 | ${PAGE_TITLE}`,
      },
      {
        path: 'details/:id',
        loadComponent: () =>
          import('./features/bangumi/pages/details/details-page').then(
            (m) => m.DetailsPage
          ),
        title: `详情 | ${PAGE_TITLE}`,
      },
      {
        path: 'kazumi',
        loadComponent: () =>
          import('./features/kazumi/layout/kazumi-layout').then(
            (m) => m.KazumiLayout
          ),
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
            canActivate: [noSearchDetails],
          },
        ],
      },
    ],
  },
  {
    path: 'no-extension',
    loadComponent: () =>
      import('./core/pages/no-extension').then((m) => m.NoExtension),
    title: PAGE_TITLE,
    canActivate: [noExtension],
    data: { hideNavigation: true } satisfies RouteData,
  },
  {
    path: 'onboarding',
    title: PAGE_TITLE,
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding-page').then(
        (m) => m.OnboardingPage
      ),
    canActivate: [noOnboarding],
    data: { hideNavigation: true } satisfies RouteData,
  },
  {
    path: '**',
    redirectTo: '',
  },
]
