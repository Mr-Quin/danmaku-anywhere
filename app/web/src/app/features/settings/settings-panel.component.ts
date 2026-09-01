import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  signal,
} from '@angular/core'
import { KazumiPolicyImport } from '../kazumi/components/kazumi-policy-import'
import { KazumiPolicyManage } from '../kazumi/components/kazumi-policy-manage'
import { type SettingsRoute, SettingsService } from './settings.service'

@Component({
  selector: 'da-settings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, KazumiPolicyManage, KazumiPolicyImport],
  template: `
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-3 px-6 py-4 border-b dark:border-surface-700">
        <i class="pi pi-cog"></i>
        <span class="text-lg font-semibold">{{ getPageTitle() }}</span>
        @if (settingsService.$canGoBack()) {
          <button
            class="ml-auto p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
            (click)="settingsService.goBack()"
          >
            <i class="pi pi-arrow-left text-xl"></i>
          </button>
        }
      </div>

      <div class="flex flex-1 overflow-hidden">
        <div class="w-64 border-r dark:border-surface-700 overflow-auto">
          <nav class="space-y-1">
            @for (item of settingsService.$routes(); track item.id) {
              <div>
                <button
                  class="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors"
                  [class]="isRouteActive(item)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-surface-100 dark:hover:bg-surface-800'"
                  (click)="onRouteClick(item)"
                >
                  <i class="pi {{ item.icon }}"></i>
                  <span class="flex-1">{{ item.label }}</span>
                  @if (item.badge && settingsService.$showBadge()) {
                    <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                  }
                  @if (item.children && item.children.length > 0) {
                    <i
                      class="pi pi-chevron-down transition-transform"
                      [class.rotate-180]="isRouteExpanded(item)"
                    ></i>
                  }
                </button>

                @if (item.children && item.children.length > 0 && isRouteExpanded(item)) {
                  <div class="ml-4 space-y-1">
                    @for (child of item.children; track child.id) {
                      <button
                        class="w-full flex items-center gap-3 px-4 py-2 text-left rounded-lg transition-colors text-sm"
                        [class]="isChildRouteActive(item, child)
                          ? 'bg-primary/10 text-primary border-l-2 border-primary'
                          : 'hover:bg-surface-100 dark:hover:bg-surface-800'"
                        (click)="onChildRouteClick(item, child)"
                      >
                        <i class="pi text-sm {{ child.icon }}"></i>
                        <span>{{ child.label }}</span>
                        @if (child.badge && settingsService.$showBadge()) {
                          <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </nav>
        </div>

        <div class="flex-1 overflow-auto px-6">
          @let currentRoute = settingsService.$currentRoute();
          @if (currentRoute) {
            @switch (currentRoute.id) {
              @case ('kazumi-manage') {
                <da-kazumi-policy-manage />
              }
              @case ('kazumi-import') {
                <da-kazumi-policy-import />
              }
              @case ('bangumi') {
                <div class="p-6">
                  <h2 class="text-xl font-semibold mb-4">Bangumi 设置</h2>
                  <p class="text-surface-600">Bangumi 相关设置将在这里显示。</p>
                </div>
              }
              @default {
                <div class="p-6">
                  <h2 class="text-xl font-semibold mb-4">通用设置</h2>
                  <p class="text-surface-600">通用设置将在这里显示。</p>
                </div>
              }
            }
          }
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'block h-full',
  },
})
export class SettingsPanelComponent implements OnInit {
  protected settingsService = inject(SettingsService)
  private $_expandedRoutes = signal<Set<string>>(new Set())

  ngOnInit() {
    this.settingsService.setRoutes([
      {
        id: 'general',
        label: '通用',
        icon: 'pi-cog',
      },
      {
        id: 'kazumi',
        label: 'Kazumi',
        icon: 'pi-box',
        badge: true,
        children: [
          {
            id: 'kazumi-manage',
            label: '管理规则',
            icon: 'pi-list',
          },
          {
            id: 'kazumi-import',
            label: '导入规则',
            icon: 'pi-download',
          },
        ],
      },
      {
        id: 'bangumi',
        label: 'Bangumi',
        icon: 'pi-video',
      },
    ])
  }

  protected isRouteActive(route: SettingsRoute): boolean {
    const currentRoute = this.settingsService.$currentRoute()
    const parentRoute = this.settingsService.$parentRoute()

    if (route.children && route.children.length > 0) {
      return route.children.some((child) => child.id === currentRoute?.id)
    }

    return currentRoute?.id === route.id && !parentRoute
  }

  protected isChildRouteActive(
    parentRoute: SettingsRoute,
    childRoute: SettingsRoute
  ): boolean {
    const currentRoute = this.settingsService.$currentRoute()
    const currentParentRoute = this.settingsService.$parentRoute()

    return (
      currentRoute?.id === childRoute.id &&
      currentParentRoute?.id === parentRoute.id
    )
  }

  protected isRouteExpanded(route: SettingsRoute): boolean {
    return this.$_expandedRoutes().has(route.id)
  }

  protected onRouteClick(route: SettingsRoute) {
    if (route.children && route.children.length > 0) {
      const wasExpanded = this.isRouteExpanded(route)
      this.$_expandedRoutes.update((expanded) => {
        const newExpanded = new Set(expanded)
        if (newExpanded.has(route.id)) {
          newExpanded.delete(route.id)
        } else {
          newExpanded.add(route.id)
        }
        return newExpanded
      })

      if (
        !wasExpanded &&
        !route.children.some((child) => this.isChildRouteActive(route, child))
      ) {
        this.settingsService.navigateToChild(route, route.children[0])
      }
      return
    }

    this.settingsService.navigateTo(route)
  }

  protected onChildRouteClick(
    parentRoute: SettingsRoute,
    childRoute: SettingsRoute
  ) {
    this.settingsService.navigateToChild(parentRoute, childRoute)
  }

  protected getPageTitle(): string {
    const currentRoute = this.settingsService.$currentRoute()
    const parentRoute = this.settingsService.$parentRoute()

    if (!currentRoute) {
      return '设置'
    }

    if (parentRoute) {
      return `${parentRoute.label} - ${currentRoute.label}`
    }

    return currentRoute.label
  }
}
