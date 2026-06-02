import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core'

import { ThemeService } from '../theme/theme.service'
import type { ColumnKind, PinnedItem } from './lane.types'
import { iconFor } from './lane-icons'

interface AppLauncher {
  kind: ColumnKind
  label: string
  badge?: boolean
}

const APPS: AppLauncher[] = [
  { kind: 'trending', label: '热门' },
  { kind: 'calendar', label: '日历' },
  { kind: 'search', label: 'Kazumi 搜索' },
  { kind: 'rules', label: '规则', badge: true },
  { kind: 'history', label: '历史' },
]

@Component({
  selector: 'da-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'sidebar',
  },
  template: `
    @for (app of apps; track app.kind) {
      <div class="slot">
        <button
          type="button"
          class="rail"
          [class.active]="activeKind() === app.kind"
          [attr.data-kind]="app.kind"
          (click)="openApp.emit(app.kind)"
        >
          <i class="pi {{ iconFor(app.kind) }}"></i>
          @if (activeKind() === app.kind) {
            <span class="marker"></span>
          }
          @if (app.badge) {
            <span class="badge"></span>
          }
        </button>
        <span class="tip">{{ app.label }}</span>
      </div>
    }

    @if (pinned().length) {
      <span class="divider"></span>
    }
    <div class="pins">
      @for (item of pinned(); track item.key) {
        <div class="slot">
          <button
            type="button"
            class="pin"
            [attr.data-key]="item.key"
            [attr.aria-label]="item.title"
            (click)="openPinned.emit(item)"
          ></button>
          <span class="tip">{{ item.title }}</span>
          <span
            class="unpin"
            role="button"
            title="取消固定"
            (click)="onUnpin($event, item.key)"
          >
            <i class="pi pi-times"></i>
          </span>
        </div>
      }
    </div>

    <span class="spacer"></span>
    <span class="divider"></span>

    <div class="slot">
      <button
        type="button"
        class="rail"
        data-testid="theme-toggle"
        (click)="themeService.toggle()"
      >
        <i class="pi {{ themeService.$isDark() ? 'pi-sun' : 'pi-moon' }}"></i>
      </button>
      <span class="tip">切换主题</span>
    </div>
    <div class="slot">
      <button type="button" class="rail" (click)="openSettings.emit()">
        <i class="pi pi-cog"></i>
      </button>
      <span class="tip">设置</span>
    </div>
  `,
  styles: `
    :host {
      width: 56px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 0 10px;
      background: var(--p-paper);
      border-right: 1px solid var(--p-divider);
      z-index: 25;
    }

    .slot {
      position: relative;
      display: flex;
      justify-content: center;
    }

    .slot:hover .tip {
      opacity: 1;
    }

    .rail {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      background: transparent;
      color: var(--p-text-muted);
      font-size: 17px;
      position: relative;
      transition: all 0.15s ease;
    }

    .rail:hover {
      background: var(--p-action-hover);
    }

    .rail.active {
      border-color: var(--p-primary);
      background: var(--p-primary-soft);
      color: var(--p-primary-ink);
    }

    .marker {
      position: absolute;
      left: -9px;
      top: 9px;
      bottom: 9px;
      width: 3px;
      border-radius: 2px;
      background: var(--p-primary);
    }

    .badge {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--p-warning);
      border: 1.5px solid var(--p-paper);
    }

    .pins {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      flex-shrink: 1;
      min-height: 0;
      scrollbar-width: none;
    }

    .pins::-webkit-scrollbar {
      display: none;
    }

    .pin {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      cursor: pointer;
      padding: 0;
      overflow: hidden;
      border: 1px solid var(--p-divider);
      background: linear-gradient(150deg, var(--p-primary-soft), var(--p-secondary-soft));
      transition: border-color 0.15s ease;
    }

    .pin:hover {
      border-color: var(--p-primary);
    }

    .unpin {
      position: absolute;
      top: -3px;
      right: 6px;
      z-index: 2;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      cursor: pointer;
      background: var(--p-tooltip-bg);
      color: var(--p-tooltip-fg);
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }

    .slot:hover .unpin {
      display: flex;
    }

    .divider {
      width: 26px;
      height: 1px;
      background: var(--p-divider);
      margin: 6px 0;
    }

    .spacer {
      flex: 1;
    }

    .tip {
      position: absolute;
      left: 48px;
      top: 50%;
      transform: translateY(-50%);
      white-space: nowrap;
      z-index: 50;
      background: var(--p-tooltip-bg);
      color: var(--p-tooltip-fg);
      font-size: 12px;
      font-weight: 600;
      padding: 4px 9px;
      border-radius: 6px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.12s ease;
    }
  `,
})
export class Sidebar {
  readonly themeService = inject(ThemeService)

  readonly activeKind = input<ColumnKind | null>(null)
  readonly pinned = input<PinnedItem[]>([])

  readonly openApp = output<ColumnKind>()
  readonly openPinned = output<PinnedItem>()
  readonly unpin = output<number>()
  readonly openSettings = output<void>()

  readonly apps = APPS
  protected readonly iconFor = iconFor

  onUnpin(event: MouseEvent, key: number) {
    event.stopPropagation()
    this.unpin.emit(key)
  }
}
