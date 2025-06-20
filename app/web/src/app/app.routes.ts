import type { Routes } from '@angular/router'
import {
  hasExtension,
  noExtension,
} from './core/extension-service/extension.guard'
import { noSearchDetails } from './features/kazumi/guards/kazumi-policy.guard'

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'kazumi',
  },
  {
    path: 'no-extension',
    loadComponent: () =>
      import('./core/pages/no-extension').then((m) => m.NoExtension),
    title: 'No Extension',
    canActivate: [noExtension],
  },
  {
    path: 'kazumi',
    loadComponent: () =>
      import('./features/kazumi/layout/kazumi-layout').then(
        (m) => m.KazumiLayout
      ),
    canActivateChild: [hasExtension],
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
        title: 'Search Content - Kazumi',
        data: { showBackButton: false },
      },
      {
        path: 'detail',
        loadComponent: () =>
          import('./features/kazumi/pages/kazumi-detail-page').then(
            (m) => m.KazumiDetailPage
          ),
        title: 'Show Details - Kazumi',
        canActivate: [noSearchDetails],
      },
    ],
  },
]
