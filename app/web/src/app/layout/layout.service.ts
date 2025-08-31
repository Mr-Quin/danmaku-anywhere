import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { computed, effect, Injectable, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { type ActivatedRouteSnapshot, Router } from '@angular/router'
import { ExtensionService } from '../core/extension/extension.service'
import { PlatformService } from '../core/services/platform.service'

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private router = inject(Router)
  private breakpointObserver = inject(BreakpointObserver)
  private extensionService = inject(ExtensionService)
  private platformService = inject(PlatformService)

  private $routerEvent = toSignal(this.router.events)

  private $currentRoute = signal(this.router.routerState.snapshot.root)

  $hasExtensionAndIsNotMobile = computed(() => {
    const isMobile = this.platformService.isMobile
    return this.extensionService.$isExtensionInstalled() && !isMobile
  })

  private $_showSidebar = signal(false)

  $showSidebar = this.$_showSidebar.asReadonly()

  $disableSidebar = computed(() => {
    return this.checkRouteFlag(this.$currentRoute(), 'hideNavigation')
  })

  $requireExtension = computed(() => {
    return this.checkRouteFlag(this.$currentRoute(), 'requireExtension')
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

  private checkRouteFlag(route: ActivatedRouteSnapshot, flag: string): boolean {
    if (route.data?.[flag] === true) {
      return true
    }

    for (const child of route.children || []) {
      if (this.checkRouteFlag(child, flag)) {
        return true
      }
    }

    return false
  }

  toggleSidebar() {
    this.$_showSidebar.update((visible) => !visible)
  }
}
