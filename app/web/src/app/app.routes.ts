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
        title: `${PAGE_TITLE} - 热门动画`,
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/bangumi/pages/calendar/calendar-page').then(
            (m) => m.CalendarPage
          ),
        title: `${PAGE_TITLE} - 放送日历`,
      },
      {
        path: 'details/:id',
        loadComponent: () =>
          import('./features/bangumi/pages/details/details-page').then(
            (m) => m.DetailsPage
          ),
        title: `${PAGE_TITLE} - 详情`,
      },
      {
        path: 'kazumi',
        loadComponent: () =>
          import('./features/kazumi/layout/kazumi-layout').then(
            (m) => m.KazumiLayout
          ),
        title: PAGE_TITLE,
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
            data: { showBackButton: false } satisfies RouteData,
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
