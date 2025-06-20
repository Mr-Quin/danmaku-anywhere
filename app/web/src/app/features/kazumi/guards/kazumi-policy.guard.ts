import { inject } from '@angular/core'
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  RedirectCommand,
  Router,
  type RouterStateSnapshot,
} from '@angular/router'
import { KazumiService } from '../services/kazumi.service'

export const noSearchDetails: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)
  const kazumiService = inject(KazumiService)
  if (kazumiService.$hasSearchDetails()) {
    return true
  }
  return new RedirectCommand(router.parseUrl('/kazumi/search'))
}
