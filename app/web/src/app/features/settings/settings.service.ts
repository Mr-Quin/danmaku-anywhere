import type { Type } from '@angular/core'
import { computed, Injectable, inject, signal } from '@angular/core'
import { KazumiService } from '../kazumi/services/kazumi.service'

export interface SettingsRoute {
  id: string
  label: string
  icon: string
  component?: Type<unknown>
  children?: SettingsRoute[]
  badge?: boolean
}

export interface SettingsNavigationState {
  currentRoute: SettingsRoute | null
  parentRoute: SettingsRoute | null
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  protected kazumiService = inject(KazumiService)

  private $_visible = signal(false)
  private $_currentRoute = signal<SettingsRoute | null>(null)
  private $_parentRoute = signal<SettingsRoute | null>(null)
  private $_navigationHistory = signal<SettingsNavigationState[]>([])
  private $_routes = signal<SettingsRoute[]>([])

  $showBadge = computed(() => {
    return this.kazumiService.$hasOutdatedPolicy()
  })

  get $visible() {
    return this.$_visible.asReadonly()
  }

  get $currentRoute() {
    return this.$_currentRoute.asReadonly()
  }

  get $parentRoute() {
    return this.$_parentRoute.asReadonly()
  }

  get $navigationHistory() {
    return this.$_navigationHistory.asReadonly()
  }

  get $routes() {
    return this.$_routes.asReadonly()
  }

  $canGoBack = computed(() => {
    return this.$_navigationHistory().length > 0
  })

  $currentNavigationState = computed(() => {
    return {
      currentRoute: this.$_currentRoute(),
      parentRoute: this.$_parentRoute(),
    }
  })

  setRoutes(routes: SettingsRoute[]) {
    this.$_routes.set(routes)
    // Set default route if no current route is set
    if (!this.$_currentRoute() && routes.length > 0) {
      this.$_currentRoute.set(routes[0])
    }
  }

  show(routeId?: string) {
    if (routeId) {
      const route = this.findRouteById(routeId)
      if (route) {
        this.navigateTo(route)
      }
    } else if (this.$_routes().length > 0) {
      this.$_currentRoute.set(this.$_routes()[0])
      this.$_parentRoute.set(null)
    }

    this.$_navigationHistory.set([])
    this.$_visible.set(true)
  }

  hide() {
    this.$_visible.set(false)
    this.$_navigationHistory.set([])
    this.$_currentRoute.set(null)
    this.$_parentRoute.set(null)
  }

  navigateTo(route: SettingsRoute) {
    // Save current state to history
    this.$_navigationHistory.update((history) => [
      ...history,
      {
        currentRoute: this.$_currentRoute(),
        parentRoute: this.$_parentRoute(),
      },
    ])

    // Check if this is a child route
    const parentRoute = this.findParentRoute(route)

    if (parentRoute) {
      this.$_parentRoute.set(parentRoute)
      this.$_currentRoute.set(route)
    } else {
      this.$_parentRoute.set(null)
      this.$_currentRoute.set(route)
    }
  }

  navigateToChild(parentRoute: SettingsRoute, childRoute: SettingsRoute) {
    this.$_navigationHistory.update((history) => [
      ...history,
      {
        currentRoute: this.$_currentRoute(),
        parentRoute: this.$_parentRoute(),
      },
    ])

    this.$_parentRoute.set(parentRoute)
    this.$_currentRoute.set(childRoute)
  }

  goBack() {
    const history = this.$_navigationHistory()
    if (history.length > 0) {
      const previousState = history[history.length - 1]
      this.$_navigationHistory.update((h) => h.slice(0, -1))
      this.$_currentRoute.set(previousState.currentRoute)
      this.$_parentRoute.set(previousState.parentRoute)
    }
  }

  private findRouteById(
    id: string,
    routes?: SettingsRoute[]
  ): SettingsRoute | null {
    const searchRoutes = routes || this.$_routes()

    for (const route of searchRoutes) {
      if (route.id === id) {
        return route
      }
      if (route.children) {
        const found = this.findRouteById(id, route.children)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  private findParentRoute(
    route: SettingsRoute,
    routes?: SettingsRoute[]
  ): SettingsRoute | null {
    const searchRoutes = routes || this.$_routes()

    for (const parentRoute of searchRoutes) {
      if (parentRoute.children) {
        if (parentRoute.children.some((child) => child.id === route.id)) {
          return parentRoute
        }
        const found = this.findParentRoute(route, parentRoute.children)
        if (found) {
          return found
        }
      }
    }
    return null
  }
}
