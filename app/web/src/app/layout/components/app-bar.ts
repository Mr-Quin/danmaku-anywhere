import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import {
  type ActivatedRouteSnapshot,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router'
import { Tag } from 'primeng/tag'
import { Banner } from './banner'

interface NavigationItem {
  path: string
  label: string
}

@Component({
  selector: 'da-app-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, Tag, RouterLinkActive, Banner],
  host: {
    class: 'basis-0 sticky z-100 top-0',
  },
  template: `
    <da-banner />
    <div class="backdrop-blur-sm bg-transparent border-b-surface-800 border-b">
      <div class="max-w-[96rem] h-[56px] mx-auto px-4 py-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold"><a routerLink="/">
            Danmaku Somewhere
          </a></h1>
          <p-tag value="预览" severity="info" />
        </div>
        <div class="flex items-center space-x-4 text-lg">
          @for (item of visibleNavItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="font-bold underline"
              class="hover:underline accent-primary primary"
            >
              {{ item.label }}
            </a>
          }
        </div>
      </div>
    </div>
  `,
})
export class AppBar {
  private router = inject(Router)
  private $routerEvent = toSignal(this.router.events)

  private readonly navigationItems: NavigationItem[] = [
    {
      path: '/trending',
      label: '热门',
    },
    {
      path: '/calendar',
      label: '日历',
    },
    {
      path: '/kazumi',
      label: 'Kazumi',
    },
  ]

  private currentRoute = signal(this.router.routerState.snapshot.root)

  constructor() {
    effect(() => {
      const data = this.$routerEvent()

      if (data) {
        this.currentRoute.set(this.router.routerState.snapshot.root)
      }
    })
  }

  protected visibleNavItems = computed(() => {
    const route = this.currentRoute()
    const shouldHideNavigation = this.hasHideNavigationFlag(route)

    return shouldHideNavigation ? [] : this.navigationItems
  })

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
}
