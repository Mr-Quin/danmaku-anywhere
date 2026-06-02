import { isPlatformBrowser } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core'

import type { Column, ColumnKind } from './lane.types'

const PILL_GLYPH: Partial<Record<ColumnKind, string>> = {
  trending: '★',
  calendar: '☷',
  search: '⌕',
  rules: '☰',
  show: '◈',
  player: '▶',
  history: '⟲',
  comments: '💬',
  showtab: '◈',
  settings: '⚙',
  local: '▤',
}

const PILL_TITLE: Partial<Record<ColumnKind, string>> = {
  trending: '热门',
  calendar: '日历',
  search: 'Kazumi 搜索',
  rules: '规则',
  history: '历史',
  settings: '设置',
  show: '详情',
  player: '播放器',
  comments: '吐槽',
  showtab: '标签',
  local: '本地视频',
}

interface PillView {
  id: string
  kind: ColumnKind
  title: string
  glyph: string
  active: boolean
  playing: boolean
}

@Component({
  selector: 'da-waybar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'app-bar',
  },
  template: `
    <div class="brand">
      <span class="logo"></span>
      <span class="name">Danmaku Anywhere</span>
    </div>
    <span class="sep"></span>

    <div class="rail" role="tablist">
      @for (pill of pills(); track pill.id; let i = $index) {
        <div
          class="pill"
          [class.active]="pill.active"
          [class.over]="overIndex() === i"
          [attr.data-active]="pill.active"
          [attr.data-kind]="pill.kind"
          [title]="pill.title"
          draggable="true"
          (dragstart)="onDragStart($event, i)"
          (dragover)="onDragOver($event, i)"
          (dragleave)="onDragLeave(i)"
          (drop)="onDrop($event, i)"
          (click)="pillClick.emit(pill.id)"
        >
          @if (pill.playing) {
            <span class="dot"></span>
          } @else {
            <span class="pglyph">{{ pill.glyph }}</span>
          }
          <span class="ptitle">{{ pill.title }}</span>
          <span
            class="pclose"
            role="button"
            title="关闭"
            (click)="onClose($event, pill.id)"
          >
            ✕
          </span>
        </div>
      }
    </div>

    <button
      type="button"
      class="palette"
      data-testid="search-trigger"
      (click)="openPalette.emit()"
    >
      <span class="picon">⌕</span>
      <span class="ptext">搜索动画、资源…</span>
      <kbd>{{ shortcut }}</kbd>
    </button>
  `,
  styles: `
    :host {
      height: 48px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      background: var(--p-paper);
      border-bottom: 1px solid var(--p-divider);
      position: relative;
      z-index: 30;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      padding-right: 4px;
    }

    .logo {
      width: 22px;
      height: 22px;
      border-radius: 7px;
      background: linear-gradient(140deg, var(--p-primary), var(--p-secondary));
      box-shadow: 0 2px 8px var(--p-action-focus);
    }

    .name {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.2px;
      color: var(--p-text);
    }

    .badge {
      padding: 1px 6px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
      background: var(--p-info-soft);
      color: var(--p-info-ink);
    }

    .sep {
      width: 1px;
      height: 22px;
      background: var(--p-divider);
      flex-shrink: 0;
    }

    .rail {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      overflow-y: hidden;
      height: 100%;
      scrollbar-width: none;
    }

    .rail::-webkit-scrollbar {
      display: none;
    }

    .pill {
      height: 30px;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 0 9px;
      border-radius: 8px;
      cursor: pointer;
      flex-shrink: 0;
      background: transparent;
      border: 1px solid transparent;
      color: var(--p-text-muted);
      max-width: 190px;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.12s ease;
    }

    .pill:hover {
      background: var(--p-action-hover);
    }

    .pill.active {
      background: var(--p-primary-soft);
      border-color: var(--p-primary);
      color: var(--p-primary-ink);
    }

    .pill.over {
      border-color: var(--p-secondary);
      box-shadow: -2px 0 0 var(--p-secondary);
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--p-success);
      flex-shrink: 0;
      box-shadow: 0 0 6px var(--p-success);
    }

    .pglyph {
      font-size: 12px;
      flex-shrink: 0;
      opacity: 0.85;
      width: 13px;
      text-align: center;
    }

    .ptitle {
      font-size: 12.5px;
      font-weight: 600;
      flex-shrink: 0;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pill.active .ptitle {
      font-weight: 700;
    }

    .pclose {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      opacity: 0.5;
      transition:
        opacity 0.15s ease,
        background 0.15s ease;
    }

    .pclose:hover {
      opacity: 1;
      background: var(--p-action-hover);
    }

    .palette {
      height: 32px;
      flex-shrink: 0;
      min-width: 230px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      border-radius: 9px;
      cursor: text;
      background: var(--p-bg);
      border: 1px solid var(--p-divider);
      color: var(--p-text-muted);
      font-size: 12.5px;
      transition: border-color 0.15s ease;
    }

    .palette:hover {
      border-color: var(--p-primary);
    }

    .picon {
      opacity: 0.7;
    }

    .ptext {
      flex: 1;
      text-align: left;
    }

    kbd {
      font-family: var(--p-mono);
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 5px;
      background: var(--p-paper-alt);
      border: 1px solid var(--p-divider);
      color: var(--p-text-muted);
    }
  `,
})
export class Waybar {
  readonly columns = input.required<Column[]>()
  readonly activeId = input<string | null>(null)
  readonly playingId = input<string | null>(null)

  readonly pillClick = output<string>()
  readonly pillClose = output<string>()
  readonly reorder = output<{ from: number; to: number }>()
  readonly openPalette = output<void>()

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID))
  readonly shortcut =
    this.isBrowser && /Mac/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'

  private readonly dragFrom = signal<number | null>(null)
  readonly overIndex = signal<number | null>(null)

  readonly pills = computed<PillView[]>(() => {
    const activeId = this.activeId()
    const playingId = this.playingId()
    return this.columns().map((col) => ({
      id: col.id,
      kind: col.kind,
      title: PILL_TITLE[col.kind] ?? col.kind,
      glyph: PILL_GLYPH[col.kind] ?? '◦',
      active: col.id === activeId,
      playing: col.id === playingId,
    }))
  })

  onClose(event: MouseEvent, id: string) {
    event.stopPropagation()
    this.pillClose.emit(id)
  }

  onDragStart(event: DragEvent, index: number) {
    this.dragFrom.set(index)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault()
    this.overIndex.set(index)
  }

  onDragLeave(index: number) {
    if (this.overIndex() === index) {
      this.overIndex.set(null)
    }
  }

  onDrop(event: DragEvent, index: number) {
    event.preventDefault()
    this.overIndex.set(null)
    const raw = event.dataTransfer?.getData('text/plain')
    const from = raw != null && raw !== '' ? Number(raw) : this.dragFrom()
    this.dragFrom.set(null)
    if (from == null || Number.isNaN(from)) {
      return
    }
    this.reorder.emit({ from, to: index })
  }
}
