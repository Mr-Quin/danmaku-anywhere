import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  signal,
} from '@angular/core'
import { Dialog } from 'primeng/dialog'
import { MaterialIcon } from '../../shared/components/material-icon'
import { KazumiPolicyImport } from '../kazumi/components/kazumi-policy-import'
import { KazumiPolicyManage } from '../kazumi/components/kazumi-policy-manage'
import { type SettingsRoute, SettingsService } from './settings.service'

@Component({
  selector: 'da-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Dialog,
    MaterialIcon,
    KazumiPolicyManage,
    KazumiPolicyImport,
  ],
  template: `
    <p-dialog
      [visible]="settingsService.$visible()"
      (visibleChange)="onVisibleChange($event)"
      dismissableMask="true"
      modal="true"
      contentStyleClass="w-6xl h-[700px] overflow-hidden"
      class="overflow-hidden"
      [maskStyle]="{background:'none'}"
      [blockScroll]="false"
      [closable]="true"
    >
      <ng-template #header>
        <div class="flex items-center gap-3">
          <da-mat-icon icon="settings" />
          <span class="text-lg font-semibold">{{ getPageTitle() }}</span>
          @if (settingsService.$canGoBack()) {
            <button
              class="ml-auto p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
              (click)="settingsService.goBack()"
            >
              <da-mat-icon icon="arrow_back" size="xl"/>
            </button>
          }
        </div>
      </ng-template>

      <div class="flex h-full">
        <div class="w-64 border-r dark:border-surface-700">
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
                  <da-mat-icon [icon]="item.icon" />
                  <span class="flex-1">{{ item.label }}</span>
                  @if (item.badge && settingsService.$showBadge()) {
                    <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                  }
                  @if (item.children && item.children.length > 0) {
                    <da-mat-icon 
                      icon="expand_more" 
                      class="transition-transform"
                      [class.rotate-180]="isRouteExpanded(item)"
                    />
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
                        <da-mat-icon [icon]="child.icon" size="sm" />
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
          @if (settingsService.$currentRoute()) {
            @switch (settingsService.$currentRoute()?.id) {
              @case ('kazumi-manage') {
                <da-kazumi-policy-manage />
              }
              @case ('kazumi-import') {
                <da-kazumi-policy-import />
              }
<!--              @case ('kazumi-create') {-->
<!--                <da-kazumi-policy-create />-->
<!--              }-->
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
    </p-dialog>
  `,
})
export class Settings implements OnInit {
  protected settingsService = inject(SettingsService)
  private $_expandedRoutes = signal<Set<string>>(new Set())

  ngOnInit() {
    this.settingsService.setRoutes([
      {
        id: 'general',
        label: '通用',
        icon: 'settings',
      },
      {
        id: 'kazumi',
        label: 'Kazumi',
        icon: 'extension',
        badge: true,
        children: [
          {
            id: 'kazumi-manage',
            label: '管理规则',
            icon: 'list',
          },
          {
            id: 'kazumi-import',
            label: '导入规则',
            icon: 'download',
          },
          // {
          //   id: 'kazumi-create',
          //   label: '创建规则',
          //   icon: 'add',
          // },
        ],
      },
      {
        id: 'bangumi',
        label: 'Bangumi',
        icon: 'movie',
      },
    ])
  }

  protected isRouteActive(route: SettingsRoute): boolean {
    const currentRoute = this.settingsService.$currentRoute()
    const parentRoute = this.settingsService.$parentRoute()

    if (route.children && route.children.length > 0) {
      // Parent route is active if any of its children are active
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
      // Toggle expansion for parent routes
      this.$_expandedRoutes.update((expanded) => {
        const newExpanded = new Set(expanded)
        if (newExpanded.has(route.id)) {
          newExpanded.delete(route.id)
        } else {
          newExpanded.add(route.id)
        }
        return newExpanded
      })

      // If this is the first time expanding and no child is selected, select the first child
      if (
        !this.isRouteExpanded(route) &&
        !route.children.some((child) => this.isChildRouteActive(route, child))
      ) {
        this.settingsService.navigateToChild(route, route.children[0])
      }
    } else {
      this.settingsService.navigateTo(route)
    }
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

    if (!currentRoute) return '设置'

    if (parentRoute) {
      return `${parentRoute.label} - ${currentRoute.label}`
    }

    return currentRoute.label
  }

  protected onVisibleChange(visible: boolean) {
    if (!visible) {
      this.settingsService.hide()
    }
  }
}
