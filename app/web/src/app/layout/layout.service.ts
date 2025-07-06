import { computed, effect, Injectable, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { type ActivatedRouteSnapshot, Router } from '@angular/router'

const BANNER_KEY = 'hide-banner'

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private router = inject(Router)

  private $routerEvent = toSignal(this.router.events)

  private $currentRoute = signal(this.router.routerState.snapshot.root)

  $showBanner = signal(!localStorage.getItem(BANNER_KEY))
  private $_showSidebar = signal(false)

  get $showSidebar() {
    return this.$_showSidebar.asReadonly()
  }

  $disableSidebar = computed(() => {
    return this.hasHideNavigationFlag(this.$currentRoute())
  })

  constructor() {
    effect(() => {
      const data = this.$routerEvent()

      if (data) {
        const currentRoute = this.router.routerState.snapshot.root
        this.$currentRoute.set(currentRoute)
      }
    })
  }

  private hasHideNavigationFlag(route: ActivatedRouteSnapshot): boolean {
    if (route.data?.['hideNavigation'] === true) {
      return true
    }

    for (const child of route.children || []) {
      if (this.hasHideNavigationFlag(child)) {
        return true
      }
    }

    return false
  }

  hideBanner() {
    localStorage.setItem(BANNER_KEY, '1')
    this.$showBanner.set(false)
  }

  toggleSidebar() {
    this.$_showSidebar.update((visible) => !visible)
  }
}
