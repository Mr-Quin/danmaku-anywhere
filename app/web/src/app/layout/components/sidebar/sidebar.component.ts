import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { Button } from 'primeng/button'
import { Drawer } from 'primeng/drawer'
import { environment } from '../../../../environments/environment'
import { SettingsService } from '../../../features/settings/settings.service'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { LayoutService } from '../../layout.service'
import { NavigationItemComponent } from './navigation-item.component'

interface NavigationItem {
  path: string
  label: string
  icon?: string
  disabled?: boolean
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
  disabled?: boolean
}

@Component({
  selector: 'da-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MaterialIcon,
    Button,
    NavigationItemComponent,
    Drawer,
  ],
  template: `
    @if (!layoutService.$disableSidebar()) {
      <!--      Mobile -->
      <p-drawer [visible]="layoutService.$showSidebar()" (onHide)="layoutService.toggleSidebar()"
                position="left"
                styleClass="max-w-[280px] bg-surface-900 border-r border-surface-800"
      >
        <ng-template #headless>
          <div class="flex flex-col h-full">
            <div class="self-end p-2">
              <p-button
                text
                rounded
                severity="secondary"
                (onClick)="layoutService.toggleSidebar()"
              >
                <ng-template #icon>
                  <da-mat-icon icon="arrow_back_ios" size="xl" />
                </ng-template>
              </p-button>
            </div>
            <div class="flex-1 overflow-y-auto">
              <ng-container [ngTemplateOutlet]="sidebarContent"></ng-container>
            </div>
            <ng-container [ngTemplateOutlet]="settingsButton"></ng-container>
          </div>
        </ng-template>

      </p-drawer>

      <!--      Desktop-->
      <div
        class="max-md:hidden min-w-[200px] h-[calc(100vh-56px)] sticky top-[56px] border-r-surface-800 border-r"
      >
        <div class="flex flex-col h-full">
          <div class="flex-1 overflow-y-auto">
            <ng-container [ngTemplateOutlet]="sidebarContent"></ng-container>
          </div>
          <ng-container [ngTemplateOutlet]="settingsButton"></ng-container>
        </div>
      </div>
    }

    <ng-template #sidebarContent>
      @for (section of $navigationSections(); track section.title) {
        <div class="p-4">
          <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">
            {{ section.title }}
          </h3>
          <div class="space-y-1">
            @for (item of section.items; track item.path) {
              <da-navigation-item
                [label]="item.label"
                [icon]="item.icon"
                [path]="item.path"
                [disabled]="item.disabled || section.disabled"
              />
            }
          </div>
        </div>
      }
    </ng-template>
    <ng-template #settingsButton>
      <div class="border-t border-surface-800">
        <p-button
          label="设置"
          text
          severity="secondary"
          (onClick)="openSettings()"
          styleClass="w-full"
          [badge]="settingsService.$showBadge() ? ' ' : undefined"
          badgeSeverity="info"
        >
          <ng-template #icon>
            <da-mat-icon icon="settings" size="lg" />
          </ng-template>
        </p-button>
      </div>
    </ng-template>
  `,
})
export class AppSidebar {
  protected layoutService = inject(LayoutService)
  protected settingsService = inject(SettingsService)

  protected readonly $navigationSections = computed((): NavigationSection[] => {
    return [
      {
        title: 'Bangumi',
        items: [
          {
            path: '/trending',
            label: '热门',
            icon: 'mode_heat',
          },
          {
            path: '/calendar',
            label: '日历',
            icon: 'calendar_today',
          },
        ],
      },
      {
        title: '本地',
        items: [
          {
            path: '/local',
            label: '本地视频',
            icon: 'folder_open',
          },
        ],
      },
      {
        title: 'Kazumi',
        items: [
          {
            path: '/kazumi',
            label: 'Kazumi',
            icon: 'search',
          },
          ...(environment.production
            ? []
            : [
                {
                  path: '/kazumi/debug',
                  label: 'Video Debug',
                  icon: 'bug_report',
                },
              ]),
        ],
      },
    ]
  })

  openSettings() {
    this.settingsService.show()
  }
}
