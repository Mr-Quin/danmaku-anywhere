import { inject } from '@angular/core'
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  RedirectCommand,
  Router,
  type RouterStateSnapshot,
} from '@angular/router'
import { environment } from '../../../../environments/environment'

export const developmentOnly: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)

  if (!environment.production) {
    return true
  }

  return new RedirectCommand(router.parseUrl('/'))
}
