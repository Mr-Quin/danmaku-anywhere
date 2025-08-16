import { inject } from '@angular/core'
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  RedirectCommand,
  Router,
  type RouterStateSnapshot,
} from '@angular/router'
import { LayoutService } from '../../layout/layout.service'

export const hasExtension: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)
  const layoutService = inject(LayoutService)

  if (layoutService.$hasExtensionAndIsNotMobile()) {
    return true
  }

  return new RedirectCommand(router.parseUrl('/local'))
}
