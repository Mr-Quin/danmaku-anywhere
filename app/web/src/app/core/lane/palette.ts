import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core'
import { injectInfiniteQuery } from '@tanstack/angular-query-experimental'

import { BangumiService } from '../../features/bangumi/services/bangumi.service'
import { transformToShowCardData } from '../../features/bangumi/utils/transform-to-show-card-data'
import type { ColumnKind } from './lane.types'

interface ShowRow {
  id: number
  title: string
  short: string
  ja: string
  rating: number
}

interface AppRow {
  kind: ColumnKind
  label: string
  glyph: string
}

const APP_ROWS: AppRow[] = [
  { kind: 'trending', label: '热门', glyph: '★' },
  { kind: 'calendar', label: '日历', glyph: '☷' },
  { kind: 'search', label: 'Kazumi 搜索', glyph: '⌕' },
  { kind: 'rules', label: '规则', glyph: '☰' },
  { kind: 'history', label: '历史', glyph: '⟲' },
]

export interface PaletteDetails {
  subjectId: number
  title: string
}

export interface PaletteWatch {
  subjectId: number
  title: string
}

@Component({
  selector: 'da-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'command-palette',
    '(click)': 'close.emit()',
  },
  template: `
    <div class="panel" (click)="$event.stopPropagation()">
      <div class="search">
        <span class="icon">⌕</span>
        <input
          #input
          data-testid="palette-input"
          type="text"
          placeholder="搜索动画、资源…"
          [value]="query()"
          (input)="onInput($event)"
        />
        <kbd>esc</kbd>
      </div>
      <div class="results">
        @if (apps().length) {
          <div class="eyebrow">应用 · {{ apps().length }}</div>
          @for (app of apps(); track app.kind) {
            <button type="button" class="row" (click)="onApp(app.kind)">
              <span class="swatch glyph">{{ app.glyph }}</span>
              <span class="label">{{ app.label }}</span>
            </button>
          }
        }
        <div class="eyebrow">动画 · {{ shows().length }}</div>
        @for (show of shows(); track show.id) {
          <div class="row" (click)="onDetails(show)">
            <span class="swatch"></span>
            <span class="label">{{ show.short }}</span>
            <span class="hint">#{{ show.id }} · ★{{ show.rating.toFixed(1) }}</span>
            <span
              class="watch"
              role="button"
              (click)="onWatch($event, show)"
            >
              ▶ 观看
            </span>
          </div>
        }
        @if (!shows().length && !apps().length) {
          <div class="empty">无结果</div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 12vh;
    }

    .panel {
      width: min(620px, 92vw);
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      background: var(--p-paper);
      border: 1px solid var(--p-divider);
      border-radius: var(--p-radius-lg);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    .search {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--p-divider);
    }

    .search .icon {
      font-size: 18px;
      opacity: 0.6;
    }

    .search input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      color: var(--p-text);
      font-size: 16px;
    }

    kbd {
      font-family: var(--p-mono);
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 5px;
      background: var(--p-paper-alt);
      border: 1px solid var(--p-divider);
      color: var(--p-text-muted);
    }

    .results {
      overflow-y: auto;
      padding: 8px;
    }

    .eyebrow {
      padding: 8px 10px 4px;
      color: var(--p-text-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 10px;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      background: transparent;
      text-align: left;
    }

    .row:hover {
      background: var(--p-action-hover);
    }

    .swatch {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      flex-shrink: 0;
      background: linear-gradient(150deg, var(--p-primary-soft), var(--p-secondary-soft));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--p-primary-ink);
    }

    .label {
      font-size: 14px;
      font-weight: 600;
      color: var(--p-text);
      white-space: nowrap;
    }

    .hint {
      flex: 1;
      text-align: right;
      font-size: 12px;
      font-family: var(--p-mono);
      color: var(--p-text-muted);
    }

    .watch {
      font-size: 12px;
      font-weight: 700;
      color: var(--p-primary-ink);
      padding: 3px 9px;
      border-radius: 6px;
      background: var(--p-primary-soft);
      cursor: pointer;
      white-space: nowrap;
    }

    .empty {
      padding: 24px;
      text-align: center;
      color: var(--p-text-muted);
      font-size: 13px;
    }
  `,
})
export class Palette {
  readonly close = output<void>()
  readonly openApp = output<ColumnKind>()
  readonly openDetails = output<PaletteDetails>()
  readonly openWatch = output<PaletteWatch>()

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input')
  private readonly bangumi = inject(BangumiService)

  readonly query = signal('')

  private readonly trendingQuery = injectInfiniteQuery(() =>
    this.bangumi.getTrendingInfiniteQueryOptions()
  )

  private readonly showRows = computed<ShowRow[]>(() => {
    if (!this.trendingQuery.isSuccess()) {
      return []
    }
    return this.trendingQuery
      .data()
      .pages.flatMap((page) => page.data)
      .map((item) => {
        const card = transformToShowCardData(item.subject)
        const title = card.title || card.altTitle || ''
        return {
          id: card.id,
          title,
          short: title,
          ja: card.altTitle ?? '',
          rating: card.rating?.score ?? 0,
        }
      })
  })

  readonly apps = computed<AppRow[]>(() => {
    const q = this.query().trim().toLowerCase()
    if (!q) {
      return APP_ROWS
    }
    return APP_ROWS.filter((a) => a.label.toLowerCase().includes(q))
  })

  readonly shows = computed<ShowRow[]>(() => {
    const rows = this.showRows()
    const q = this.query().trim().toLowerCase()
    if (!q) {
      return rows
    }
    return rows.filter((s) => {
      return (
        s.short.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.ja.toLowerCase().includes(q)
      )
    })
  })

  constructor() {
    afterNextRender(() => {
      this.inputRef()?.nativeElement.focus()
    })
  }

  onInput(event: Event) {
    this.query.set((event.target as HTMLInputElement).value)
  }

  onApp(kind: ColumnKind) {
    this.openApp.emit(kind)
    this.close.emit()
  }

  onDetails(show: ShowRow) {
    this.openDetails.emit({ subjectId: show.id, title: show.short })
    this.close.emit()
  }

  onWatch(event: MouseEvent, show: ShowRow) {
    event.stopPropagation()
    this.openWatch.emit({ subjectId: show.id, title: show.short })
    this.close.emit()
  }
}
