import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core'

import { ColumnBodyHost } from './column-body-host'
import type { Column, ColumnKind } from './lane.types'

const GLYPH: Partial<Record<ColumnKind, string>> = {
  trending: '★',
  calendar: '☷',
  search: '⌕',
  rules: '☰',
  show: '◈',
  player: '▶',
  history: '⟲',
  settings: '⚙',
  comments: '💬',
  showtab: '◈',
  local: '▤',
  onboarding: '✦',
  'debug-video': '⚇',
  playground: '⚗',
}

const TITLE: Partial<Record<ColumnKind, string>> = {
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
  onboarding: '引导',
  'debug-video': 'Debug Video',
  playground: 'Playground',
}

@Component({
  selector: 'da-column-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ColumnBodyHost],
  host: {
    'data-testid': 'lane',
    '[attr.data-kind]': 'col().kind',
    '[attr.data-column-id]': 'col().id',
    '[attr.data-active]': 'active()',
    '[style.width.px]': 'width()',
    '[class.active]': 'active()',
    '(pointerdown)': 'activate.emit()',
  },
  template: `
    <header class="header">
      <span class="glyph">{{ glyph() }}</span>
      <span class="title">{{ title() }}</span>
      @if (sub()) {
        <span class="sub">{{ sub() }}</span>
      }
      <span class="spacer"></span>
      @if (pinnable()) {
        <button
          type="button"
          class="hbtn"
          [class.on]="pinned()"
          [title]="pinned() ? '取消固定到侧栏' : '固定到侧栏'"
          (click)="pin.emit()"
        >
          ⚲
        </button>
      }
      <button type="button" class="hbtn" title="调整宽度" (click)="resize.emit()">
        ↔
      </button>
      <button
        type="button"
        class="hbtn"
        [class.on]="col().full"
        [title]="col().full ? '还原' : '铺满'"
        (click)="toggleFull.emit()"
      >
        {{ col().full ? '⤡' : '⛶' }}
      </button>
      <button type="button" class="hbtn" title="关闭" (click)="close.emit()">
        ✕
      </button>
    </header>
    <div class="scroll kz-scroll" data-colscroll>
      <da-column-body-host [col]="col()" />
    </div>
    <div
      class="resizer"
      title="拖动调整宽度"
      (pointerdown)="onResizeStart($event)"
    ></div>
  `,
  styles: `
    :host {
      position: relative;
      flex-shrink: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--p-paper);
      border: 1px solid var(--p-divider);
      border-radius: var(--p-radius);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
      overflow: hidden;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        width 0.22s ease;
    }

    :host(.active) {
      border-color: var(--p-primary);
      box-shadow: 0 0 0 3px var(--p-action-focus);
    }

    .header {
      height: 36px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px 0 12px;
      border-bottom: 1px solid var(--p-divider);
      background: var(--p-paper-alt);
    }

    :host(.active) .header {
      background: var(--p-primary-soft);
    }

    .glyph {
      font-size: 12px;
      opacity: 0.85;
      color: var(--p-text-muted);
    }

    :host(.active) .glyph {
      color: var(--p-primary-ink);
    }

    .title {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--p-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host(.active) .title {
      color: var(--p-primary-ink);
    }

    .sub {
      font-size: 11px;
      font-family: var(--p-mono);
      color: var(--p-text-muted);
    }

    .spacer {
      flex: 1;
    }

    .hbtn {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: var(--p-text-muted);
      font-size: 12px;
      transition:
        background 0.15s ease,
        color 0.15s ease;
    }

    .hbtn:hover {
      background: var(--p-action-hover);
    }

    .hbtn.on {
      background: var(--p-action-selected);
      color: var(--p-primary);
    }

    .scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
      container-type: inline-size;
    }

    .resizer {
      position: absolute;
      top: 36px;
      right: 0;
      bottom: 0;
      width: 7px;
      cursor: col-resize;
      z-index: 5;
      touch-action: none;
    }

    .resizer::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      width: 2px;
      background: transparent;
      transition: background 0.15s ease;
    }

    .resizer:hover::after {
      background: var(--p-primary);
    }
  `,
})
export class ColumnShell {
  readonly col = input.required<Column>()
  readonly active = input(false)
  readonly width = input.required<number>()
  readonly pinnable = input(false)
  readonly pinned = input(false)

  readonly close = output<void>()
  readonly pin = output<void>()
  readonly resize = output<void>()
  readonly toggleFull = output<void>()
  readonly activate = output<void>()
  readonly widthChange = output<number>()

  onResizeStart(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    const handle = event.target as HTMLElement
    const startX = event.clientX
    const startWidth = this.width()
    handle.setPointerCapture(event.pointerId)
    const onMove = (move: PointerEvent) => {
      this.widthChange.emit(startWidth + (move.clientX - startX))
    }
    const onUp = () => {
      handle.releasePointerCapture(event.pointerId)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
  }

  readonly glyph = computed(() => GLYPH[this.col().kind] ?? '◦')
  readonly title = computed(() => TITLE[this.col().kind] ?? this.col().kind)
  readonly sub = computed(() => {
    const col = this.col()
    return 'sub' in col ? col.sub : undefined
  })
}
