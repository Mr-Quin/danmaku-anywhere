import { inject } from '@angular/core'
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  RedirectCommand,
  Router,
  type RouterStateSnapshot,
} from '@angular/router'
import { OnboardingService } from '../services/onboarding.service'

export const requireOnboarding: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)
  const onboardingService = inject(OnboardingService)

  if (onboardingService.$isOnboardingComplete()) {
    return true
  }

  return new RedirectCommand(router.parseUrl('/onboarding'))
}

export const noOnboarding: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)
  const onboardingService = inject(OnboardingService)

  if (onboardingService.$isOnboardingComplete()) {
    return new RedirectCommand(router.parseUrl('/'))
  }

  return true
}
