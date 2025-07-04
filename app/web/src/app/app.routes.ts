import type { Routes } from '@angular/router'
import { hasExtension, noExtension } from './core/extension/extension.guard'
import { noSearchDetails } from './features/kazumi/guards/kazumi-policy.guard'
import { PAGE_TITLE } from './shared/constants'

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
    title: PAGE_TITLE,
    canActivate: [noExtension],
  },
  {
    path: 'kazumi',
    loadComponent: () =>
      import('./features/kazumi/layout/kazumi-layout').then(
        (m) => m.KazumiLayout
      ),
    canActivateChild: [hasExtension],
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
        data: { showBackButton: false },
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
]
