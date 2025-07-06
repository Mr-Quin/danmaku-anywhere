import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { computed, effect, Injectable, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { type ActivatedRouteSnapshot, Router } from '@angular/router'

const BANNER_KEY = 'hide-banner'

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private router = inject(Router)
  private breakpointObserver = inject(BreakpointObserver)

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

  private screenSizeMap = new Map<string, ScreenSize>([
    [Breakpoints.XSmall, 'xs'],
    [Breakpoints.Small, 'sm'],
    [Breakpoints.Medium, 'md'],
    [Breakpoints.Large, 'lg'],
    [Breakpoints.XLarge, 'xl'],
  ])

  private $breakpoints = toSignal(
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge,
    ])
  )

  $screenSize = computed((): ScreenSize => {
    const result = this.$breakpoints()
    if (!result) return 'xs'
    for (const query of Object.keys(result.breakpoints)) {
      if (result.breakpoints[query]) {
        return this.screenSizeMap.get(query) ?? 'xs'
      }
    }
    return 'xs'
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
