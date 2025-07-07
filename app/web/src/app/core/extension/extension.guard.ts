import { Platform } from '@angular/cdk/platform'
import { inject } from '@angular/core'
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  RedirectCommand,
  Router,
  type RouterStateSnapshot,
} from '@angular/router'
import { ExtensionService } from './extension.service'

export const hasExtension: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)
  const extensionService = inject(ExtensionService)
  const platform = inject(Platform)
  const isMobile = platform.IOS || platform.ANDROID

  if (extensionService.$isExtensionInstalled() && !isMobile) {
    return true
  }
  return new RedirectCommand(router.parseUrl('/no-extension'))
}

export const noExtension: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router)
  const extensionService = inject(ExtensionService)
  const platform = inject(Platform)
  const isMobile = platform.IOS || platform.ANDROID

  if (!extensionService.$isExtensionInstalled() || isMobile) {
    return true
  }
  return new RedirectCommand(router.parseUrl('/'))
}
