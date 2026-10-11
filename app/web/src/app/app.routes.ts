import type { Routes } from '@angular/router'
import { hasExtension } from './core/extension/extension.guard'
import { LaneShell } from './core/lane/lane-shell'
import {
  noOnboarding,
  requireOnboarding,
} from './features/onboarding/guards/onboarding.guard'
import { PAGE_TITLE } from './shared/constants'
import type { RouteData } from './shared/types'

export const routes: Routes = [
  {
    path: '',
    canActivate: [requireOnboarding],
    component: LaneShell,
    title: PAGE_TITLE,
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
