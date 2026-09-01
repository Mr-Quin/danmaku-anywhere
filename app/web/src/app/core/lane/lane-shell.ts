import { isPlatformBrowser } from '@angular/common'
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core'

import { environment } from '../../../environments/environment'
import { DebugOverlay } from '../../features/debug/debug-overlay/debug-overlay'
import { ColumnShell } from './column-shell'
import { PipTeleportManager } from './columns/pip-teleport'
import { LaneStore } from './lane.store'
import type { Column, ColumnKind } from './lane.types'
import { Palette, type PaletteWatch } from './palette'
import { Sidebar } from './sidebar'
import { Waybar } from './waybar'

const PINNABLE_KINDS = new Set<ColumnKind>([
  'show',
  'player',
  'comments',
  'showtab',
])
const LEFT_INSET = 24
const FULL_GUTTER = 48
const FULL_MIN_WIDTH = 360

@Component({
  selector: 'da-lane-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Waybar, Sidebar, ColumnShell, Palette, DebugOverlay],
  host: {
    'data-testid': 'app-shell',
  },
  template: `
    <da-waybar
      [columns]="columns()"
      [activeId]="activeId()"
      [playingId]="playerColumnId()"
      (pillClick)="focusColumn($event)"
      (pillClose)="store.close($event)"
      (reorder)="store.reorder($event.from, $event.to)"
      (openPalette)="openPalette()"
    />

    <div class="body">
      <da-sidebar
        [activeKind]="activeKind()"
        [pinned]="pinned()"
        (openApp)="onOpenApp($event)"
        (openPinned)="onOpenDetails($event.key, $event.title)"
        (unpin)="store.unpin($event)"
        (openSettings)="onOpenApp('settings')"
      />

      <div #lane class="lane kz-scroll" data-testid="lane-container">
        @for (col of columns(); track col.id) {
          <da-column-shell
            [col]="col"
            [active]="col.id === activeId()"
            [width]="widthFor(col)"
            [pinnable]="isPinnable(col)"
            [pinned]="isPinned(col)"
            (activate)="store.setActive(col.id)"
            (close)="store.close(col.id)"
            (pin)="onPin(col)"
            (resize)="store.resize(col.id)"
            (widthChange)="store.setWidth(col.id, $event)"
            (toggleFull)="onToggleFull(col.id)"
          />
        }
        <div class="hint">
          <span class="plus"><i class="pi pi-plus"></i></span>
          点击海报或左侧应用<br />在此打开新的一列
        </div>
      </div>
    </div>

    <div class="pip" [class.on]="floating()">
      <div #pipSlot class="pip-inner" data-testid="pip-slot"></div>
    </div>

    @if (paletteOpen()) {
      <da-palette
        (close)="closePalette()"
        (openApp)="onOpenApp($event)"
        (openDetails)="onOpenDetails($event.subjectId, $event.title)"
        (openWatch)="onOpenWatch($event)"
      />
    }

    @if (!isProduction) {
      <da-debug-overlay />
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--p-bg);
    }

    .body {
      flex: 1;
      min-height: 0;
      display: flex;
    }

    .lane {
      flex: 1;
      min-height: 0;
      min-width: 0;
      display: flex;
      gap: 20px;
      align-items: stretch;
      padding: 20px 24px;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .hint {
      width: 220px;
      flex-shrink: 0;
      align-self: center;
      height: min(70%, 360px);
      border: 1px dashed var(--p-divider);
      border-radius: var(--p-radius);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--p-text-muted);
      font-size: 12.5px;
      text-align: center;
      padding: 24px;
      line-height: 1.6;
    }

    .plus {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      border: 1px dashed var(--p-divider);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .pip {
      position: fixed;
      right: 22px;
      bottom: 22px;
      width: 340px;
      aspect-ratio: 16 / 9;
      z-index: 60;
      border-radius: 12px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(12px) scale(0.96);
      transition:
        opacity 0.26s ease,
        transform 0.26s ease;
    }

    .pip.on {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
      box-shadow:
        0 16px 44px rgba(0, 0, 0, 0.55),
        0 0 0 3px var(--p-action-focus);
    }

    .pip-inner {
      position: absolute;
      inset: 0;
    }
  `,
})
export class LaneShell {
  readonly store = inject(LaneStore)
  private readonly platformId = inject(PLATFORM_ID)
  private readonly destroyRef = inject(DestroyRef)
  private readonly pip = inject(PipTeleportManager)
  private readonly isBrowser = isPlatformBrowser(this.platformId)

  protected readonly isProduction = environment.production

  private readonly laneRef = viewChild<ElementRef<HTMLDivElement>>('lane')
  private readonly pipSlotRef = viewChild<ElementRef<HTMLDivElement>>('pipSlot')

  readonly columns = this.store.columns
  readonly activeId = this.store.activeId
  readonly floating = this.store.floating
  readonly pinned = this.store.pinned
  readonly playerColumnId = this.store.$playerColumnId

  readonly activeKind = computed<ColumnKind | null>(() => {
    return this.store.$activeColumn()?.kind ?? null
  })

  private readonly laneWidth = signal(1200)
  readonly paletteOpen = signal(false)

  // Tracks the column ids known to the shell so an open initiated anywhere
  // (a show card inside a body, a deep link, the sidebar) focuses the new
  // column. Dedupe-focus opens append no new id, so this never double-fires
  // for them; the explicit focusColumn paths handle those.
  private knownColumnIds = new Set<string>()

  constructor() {
    afterNextRender(() => {
      this.pip.setPipSlot(this.pipSlotRef()?.nativeElement ?? null)
      const lane = this.laneRef()?.nativeElement
      if (!lane) {
        return
      }
      this.seedActive()
      this.observeLane(lane)
      this.listenScroll(lane)
      this.listenWheel(lane)
      this.listenKeyboard()
    })

    effect(() => {
      const ids = this.columns().map((c) => c.id)
      this.focusNewlyOpened(ids)
    })

    this.destroyRef.onDestroy(() => {
      this.pip.setPipSlot(null)
    })
  }

  private focusNewlyOpened(ids: string[]) {
    const appended = ids.filter((id) => !this.knownColumnIds.has(id))
    this.knownColumnIds = new Set(ids)
    if (!this.isBrowser) {
      return
    }
    if (appended.length !== 1) {
      return
    }
    // Defer out of the effect so the store write happens after this change
    // detection pass and the new column is in the DOM before scrolling to it.
    const id = appended[0]
    setTimeout(() => this.focusColumn(id))
  }

  widthFor(col: Column): number {
    if (col.full) {
      return Math.max(FULL_MIN_WIDTH, this.laneWidth() - FULL_GUTTER)
    }
    return col.width
  }

  isPinnable(col: Column): boolean {
    if (!PINNABLE_KINDS.has(col.kind)) {
      return false
    }
    return 'subjectId' in col && col.subjectId != null
  }

  isPinned(col: Column): boolean {
    if (!('subjectId' in col) || col.subjectId == null) {
      return false
    }
    const subjectId = col.subjectId
    return this.pinned().some((p) => p.key === subjectId)
  }

  onPin(col: Column) {
    if (!('subjectId' in col) || col.subjectId == null) {
      return
    }
    const title = 'sub' in col && col.sub ? col.sub : `#${col.subjectId}`
    this.store.togglePin({ key: col.subjectId, title })
  }

  onToggleFull(id: string) {
    this.store.toggleFull(id)
    this.store.setActive(id)
    this.scrollToColumn(id, true)
  }

  onOpenApp(kind: ColumnKind) {
    const id = this.store.openApp(kind)
    this.focusColumn(id)
  }

  onOpenDetails(subjectId: number, title: string) {
    const id = this.store.openDetails(subjectId, title)
    this.focusColumn(id)
  }

  onOpenWatch(watch: PaletteWatch) {
    const id = this.store.openWatch({
      subjectId: watch.subjectId,
      title: watch.title,
    })
    this.focusColumn(id)
  }

  focusColumn(id: string) {
    this.store.setActive(id)
    this.scrollToColumn(id)
  }

  openPalette() {
    this.paletteOpen.set(true)
  }

  closePalette() {
    this.paletteOpen.set(false)
  }

  private seedActive() {
    if (this.activeId() != null) {
      return
    }
    const first = this.columns()[0]
    if (first) {
      this.store.setActive(first.id)
    }
  }

  private scrollToColumn(id: string, center = false) {
    if (!this.isBrowser) {
      return
    }
    const lane = this.laneRef()?.nativeElement
    if (!lane) {
      return
    }
    requestAnimationFrame(() => {
      const el = lane.querySelector<HTMLElement>(`[data-column-id="${id}"]`)
      if (!el) {
        return
      }
      const laneRect = lane.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const delta = center
        ? elRect.left + elRect.width / 2 - (laneRect.left + laneRect.width / 2)
        : elRect.left - laneRect.left - LEFT_INSET
      lane.scrollTo({ left: lane.scrollLeft + delta, behavior: 'smooth' })
    })
  }

  private observeLane(lane: HTMLDivElement) {
    const ro = new ResizeObserver(() => {
      this.laneWidth.set(lane.clientWidth)
    })
    ro.observe(lane)
    this.laneWidth.set(lane.clientWidth)
    this.destroyRef.onDestroy(() => {
      ro.disconnect()
    })
  }

  private listenScroll(lane: HTMLDivElement) {
    const recompute = () => {
      const laneRect = lane.getBoundingClientRect()
      const cols = Array.from(
        lane.querySelectorAll<HTMLElement>('[data-column-id]')
      )
      let best: HTMLElement | null = null
      let bestDist = Number.POSITIVE_INFINITY
      for (const el of cols) {
        const dist = Math.abs(
          el.getBoundingClientRect().left - laneRect.left - LEFT_INSET
        )
        if (dist < bestDist) {
          bestDist = dist
          best = el
        }
      }
      const bestId = best?.getAttribute('data-column-id')
      if (bestId && bestId !== this.activeId()) {
        this.store.setActive(bestId)
      }

      const playerId = this.playerColumnId()
      if (!playerId) {
        if (this.floating()) {
          this.store.setFloating(false)
        }
        return
      }
      const playerEl = lane.querySelector<HTMLElement>(
        `[data-column-id="${playerId}"]`
      )
      if (!playerEl) {
        return
      }
      const rect = playerEl.getBoundingClientRect()
      const visible = Math.max(
        0,
        Math.min(rect.right, laneRect.right) -
          Math.max(rect.left, laneRect.left)
      )
      const ratio = rect.width > 0 ? visible / rect.width : 1
      this.store.setFloating(ratio < 0.5)
    }

    // Coalesce scroll handling into a single animation frame so the
    // getBoundingClientRect reads do not thrash layout on every scroll event.
    let frameId: number | null = null
    const onScroll = () => {
      if (frameId !== null) {
        return
      }
      frameId = requestAnimationFrame(() => {
        frameId = null
        recompute()
      })
    }

    lane.addEventListener('scroll', onScroll, { passive: true })
    const timer = setTimeout(recompute, 80)
    this.destroyRef.onDestroy(() => {
      lane.removeEventListener('scroll', onScroll)
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      clearTimeout(timer)
    })
  }

  private listenWheel(lane: HTMLDivElement) {
    // getComputedStyle forces synchronous layout, so cache the per-element
    // scrollability to keep this non-passive wheel handler off the hot path.
    const scrollableCache = new WeakMap<HTMLElement, boolean>()
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return
      }
      const target = event.target
      const colEl =
        target instanceof Element ? target.closest('[data-column-id]') : null
      // Walk from the wheel target up through the column and let the nearest
      // scrollable ancestor consume the wheel if it isn't at its edge yet.
      // This covers both the main column scroller and any nested scroll
      // container (rules, local, debug bodies) so inner scrolling still works.
      if (colEl && target instanceof Element) {
        let el: Element | null = target
        while (el) {
          if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight) {
            let scrollable = scrollableCache.get(el)
            if (scrollable === undefined) {
              const overflowY = getComputedStyle(el).overflowY
              scrollable = overflowY === 'auto' || overflowY === 'scroll'
              scrollableCache.set(el, scrollable)
            }
            if (scrollable) {
              const atTop = el.scrollTop <= 0
              const atBottom =
                el.scrollTop + el.clientHeight >= el.scrollHeight - 1
              const canScroll =
                (event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)
              if (canScroll) {
                return
              }
            }
          }
          if (el === colEl) {
            break
          }
          el = el.parentElement
        }
      }
      event.preventDefault()
      lane.scrollLeft += event.deltaY * 1.1
    }

    lane.addEventListener('wheel', onWheel, { passive: false })
    this.destroyRef.onDestroy(() => {
      lane.removeEventListener('wheel', onWheel)
    })
  }

  private listenKeyboard() {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }
      const target = event.target as HTMLElement | null
      const tag = target?.tagName ?? ''
      const inField =
        /input|textarea/i.test(tag) || target?.isContentEditable === true

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        this.paletteOpen.update((open) => !open)
        return
      }
      if (event.key === 'Escape') {
        this.paletteOpen.set(false)
        return
      }
      if (inField) {
        return
      }
      const key = event.key.toLowerCase()
      if (event.key === 'ArrowRight' || key === 'l') {
        event.preventDefault()
        this.step(1)
        return
      }
      if (event.key === 'ArrowLeft' || key === 'h') {
        event.preventDefault()
        this.step(-1)
        return
      }
      if (key === 'f') {
        const active = this.store.$activeColumn()
        if (active) {
          this.onToggleFull(active.id)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('keydown', onKey)
    })
  }

  private step(dir: number) {
    const ids = this.columns().map((c) => c.id)
    if (!ids.length) {
      return
    }
    const current = Math.max(0, ids.indexOf(this.activeId() ?? ''))
    const next = Math.min(ids.length - 1, Math.max(0, current + dir))
    this.focusColumn(ids[next])
  }
}
